import re

file_path = 'C:/Source/HIS/backend/src/HIS.Infrastructure/Services/LISCompleteService.cs'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check what needs to be fixed
if '_context.LabOrderItems' in content:
    print('Found _context.LabOrderItems - replacing entire foreach block with SQL approach')

    # Find the foreach block in ProcessAnalyzerResultAsync and replace it with SQL
    old_block_start = 'foreach (var result in labResults)'
    old_block_end = '            await _context.SaveChangesAsync();'

    start_idx = content.find(old_block_start)
    if start_idx == -1:
        print('ERROR: Could not find foreach start')
        exit(1)

    end_idx = content.find(old_block_end, start_idx)
    if end_idx == -1:
        print('ERROR: Could not find SaveChangesAsync')
        exit(1)

    # Find the actual end of the foreach (before SaveChangesAsync)
    # Need to find the closing brace before SaveChangesAsync
    before_save = content[start_idx:end_idx]

    # Replace the entire block
    new_block = '''foreach (var result in labResults)
            {
                _logger.LogInformation("Processing result: SampleId={SampleId}, TestCode={TestCode}, Value={Value}",
                    result.SampleId, result.TestCode, result.Value);

                // Try to match with existing lab order by SampleBarcode and TestCode using direct SQL
                Guid? matchedItemId = null;
                Guid? matchedOrderId = null;
                decimal? normalMin = null, normalMax = null, criticalLow = null, criticalHigh = null;

                using (var conn = new SqlConnection(_configuration.GetConnectionString("DefaultConnection")))
                {
                    await conn.OpenAsync();

                    // Find matching order item
                    var findSql = @"
                        SELECT i.Id, i.LabOrderId, i.NormalMin, i.NormalMax, i.CriticalLow, i.CriticalHigh
                        FROM LabOrderItems i
                        INNER JOIN LabOrders o ON i.LabOrderId = o.Id
                        WHERE o.SampleBarcode = @SampleBarcode AND i.TestCode = @TestCode";

                    using (var cmd = new SqlCommand(findSql, conn))
                    {
                        cmd.Parameters.AddWithValue("@SampleBarcode", result.SampleId ?? "");
                        cmd.Parameters.AddWithValue("@TestCode", result.TestCode ?? "");

                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                matchedItemId = reader.GetGuid(0);
                                matchedOrderId = reader.GetGuid(1);
                                normalMin = reader.IsDBNull(2) ? null : reader.GetDecimal(2);
                                normalMax = reader.IsDBNull(3) ? null : reader.GetDecimal(3);
                                criticalLow = reader.IsDBNull(4) ? null : reader.GetDecimal(4);
                                criticalHigh = reader.IsDBNull(5) ? null : reader.GetDecimal(5);
                            }
                        }
                    }

                    if (matchedItemId.HasValue)
                    {
                        _logger.LogInformation("Matched order item: {OrderItemId} for barcode {Barcode}",
                            matchedItemId, result.SampleId);

                        // Calculate result status based on reference ranges
                        int resultStatus = 0;
                        if (decimal.TryParse(result.Value, out var numericValue))
                        {
                            if (criticalLow.HasValue && numericValue < criticalLow.Value)
                                resultStatus = 3; // Critical Low
                            else if (criticalHigh.HasValue && numericValue > criticalHigh.Value)
                                resultStatus = 4; // Critical High
                            else if (normalMin.HasValue && numericValue < normalMin.Value)
                                resultStatus = 1; // Low
                            else if (normalMax.HasValue && numericValue > normalMax.Value)
                                resultStatus = 2; // High
                        }

                        // Update result in LabOrderItem
                        var updateItemSql = @"
                            UPDATE LabOrderItems
                            SET Result = @Result, ResultStatus = @ResultStatus, ResultEnteredAt = GETDATE()
                            WHERE Id = @ItemId";

                        using (var updateCmd = new SqlCommand(updateItemSql, conn))
                        {
                            updateCmd.Parameters.AddWithValue("@Result", result.Value ?? "");
                            updateCmd.Parameters.AddWithValue("@ResultStatus", resultStatus);
                            updateCmd.Parameters.AddWithValue("@ItemId", matchedItemId.Value);
                            await updateCmd.ExecuteNonQueryAsync();
                        }

                        // Check if all items have results, update order status
                        var checkSql = @"
                            SELECT COUNT(*) FROM LabOrderItems
                            WHERE LabOrderId = @OrderId AND (Result IS NULL OR Result = '')";

                        using (var checkCmd = new SqlCommand(checkSql, conn))
                        {
                            checkCmd.Parameters.AddWithValue("@OrderId", matchedOrderId.Value);
                            var pendingCount = (int)await checkCmd.ExecuteScalarAsync();

                            int newStatus = pendingCount == 0 ? 3 : 2; // 3=Chờ duyệt, 2=Đang XN

                            var updateOrderSql = @"
                                UPDATE LabOrders SET Status = @Status,
                                ProcessingEndTime = CASE WHEN @Status = 3 THEN GETDATE() ELSE ProcessingEndTime END
                                WHERE Id = @OrderId";

                            using (var updateOrderCmd = new SqlCommand(updateOrderSql, conn))
                            {
                                updateOrderCmd.Parameters.AddWithValue("@Status", newStatus);
                                updateOrderCmd.Parameters.AddWithValue("@OrderId", matchedOrderId.Value);
                                await updateOrderCmd.ExecuteNonQueryAsync();
                            }
                        }

                        // Save raw result as matched
                        var rawResult = new LabRawResult
                        {
                            AnalyzerId = analyzerId,
                            SampleId = result.SampleId,
                            PatientId = result.PatientId,
                            TestCode = result.TestCode,
                            Result = result.Value,
                            Unit = result.Units,
                            Flag = result.AbnormalFlag,
                            ResultTime = result.ResultDateTime,
                            RawMessage = rawData,
                            Status = 1, // Matched
                            MappedToLabRequestItemId = matchedItemId.Value,
                            MappedAt = DateTime.Now
                        };
                        _context.LabRawResults.Add(rawResult);

                        matchedCount++;
                    }
                    else
                    {
                        _logger.LogWarning("No matching order found for SampleId={SampleId}, TestCode={TestCode}",
                            result.SampleId, result.TestCode);

                        // Save as unmatched raw result
                        var rawResult = new LabRawResult
                        {
                            AnalyzerId = analyzerId,
                            SampleId = result.SampleId,
                            PatientId = result.PatientId,
                            TestCode = result.TestCode,
                            Result = result.Value,
                            Unit = result.Units,
                            Flag = result.AbnormalFlag,
                            ResultTime = result.ResultDateTime,
                            RawMessage = rawData,
                            Status = 0 // Pending/Unmatched
                        };
                        _context.LabRawResults.Add(rawResult);
                    }
                }
            }

'''

    # Find end of foreach block - count braces
    brace_count = 0
    foreach_end = start_idx
    in_string = False
    i = start_idx
    while i < len(content):
        c = content[i]
        if c == '"' and (i == 0 or content[i-1] != '\\'):
            in_string = not in_string
        if not in_string:
            if c == '{':
                brace_count += 1
            elif c == '}':
                brace_count -= 1
                if brace_count == 0:
                    foreach_end = i + 1
                    break
        i += 1

    print(f'foreach block: {start_idx} to {foreach_end}')

    # Replace
    content = content[:start_idx] + new_block + content[foreach_end:]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Successfully replaced foreach block with SQL approach')

elif 'SqlConnection(_configuration' in content and 'LabOrderItems i' in content:
    print('Already using SQL approach - no changes needed')
else:
    print('Unknown state - checking for patterns...')
    if '_context.LabRequestItems' in content:
        print('Using LabRequestItems EF DbSet')
    if 'SqlConnection' in content:
        print('Has SqlConnection usage')
