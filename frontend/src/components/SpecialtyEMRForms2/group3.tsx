import { forwardRef } from 'react';
import dayjs from 'dayjs';
import { printStyles, PrintHeader, SignatureBlock, Field, Checkbox, DottedLines, type SpecialtyEMRPrintData } from './_shared';

// Helper render — các table-row trong dữ liệu chăm sóc/dịch truyền/thuốc của các
// BA chuyên khoa không có DTO strict, vẫn cần render text.
type RowAny = Record<string, unknown> | undefined;
const cell = (v: unknown): React.ReactNode => v === null || v === undefined || v === '' ? '' : (v as React.ReactNode);
const rowKey = (r: RowAny, i: number): React.Key => (typeof r?.id === 'string' || typeof r?.id === 'number' ? r.id : i);
export const NgoaiTruPHCNBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 26/BV1" />
      <h2>BỆNH ÁN PHCN NGOẠI TRÚ</h2>
      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={data?.patientCode} /></div>
          <div className="col"><Field label="Số BHYT" value={data?.insuranceNumber} /></div>
          <div className="col"><Field label="SĐT" value={data?.phoneNumber} /></div>
        </div>
        <Field label="Địa chỉ" value={data?.address} />
        <Field label="Ngày khám" value={data?.examDate ? dayjs(data.examDate).format('DD/MM/YYYY') : undefined} />
      </div>

      <div className="section">
        <div className="section-title">I. LÝ DO KHÁM</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. CHẨN ĐOÁN GỐC</div>
        <Field label="Chẩn đoán" value={data?.originalDiagnosis} />
        <Field label="Ngày khởi phát" value={data?.onsetDate ? dayjs(data.onsetDate).format('DD/MM/YYYY') : undefined} />
      </div>

      <div className="section">
        <div className="section-title">III. ĐÁNH GIÁ CHỨC NĂNG</div>
        <Field label="Barthel" value={data?.barthel ? `${data.barthel}/100` : undefined} />
        <Field label="VAS đau" value={data?.painVas ? `${data.painVas}/10` : undefined} />
        <Field label="ROM" value={data?.rom} />
        <Field label="Sức cơ" value={data?.muscleStrength} />
        <Field label="Thăng bằng" value={data?.balance} />
        <Field label="Đi bộ" value={data?.ambulation} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">IV. KẾ HOẠCH PHCN</div>
        <Field label="Mục tiêu" value={data?.goal} />
        <div className="checkbox-row">
          <Checkbox label="Vật lý trị liệu" checked={data?.pt} />
          <Checkbox label="Hoạt động trị liệu" checked={data?.ot} />
          <Checkbox label="Ngôn ngữ trị liệu" checked={data?.st} />
          <Checkbox label="Điện trị liệu" checked={data?.electrotherapy} />
          <Checkbox label="Thủy trị liệu" checked={data?.hydrotherapy} />
        </div>
        <DottedLines content={data?.rehabPlan} count={4} />
        <Field label="Số buổi / tuần" value={data?.sessionsPerWeek} />
        <Field label="Tổng số buổi dự kiến" value={data?.totalSessions} />
      </div>

      <div className="section">
        <div className="section-title">V. ĐƠN THUỐC (nếu có)</div>
        <DottedLines content={data?.prescription} count={3} />
      </div>

      <div className="section">
        <Field label="Hẹn tái khám" value={data?.followUpDate ? dayjs(data.followUpDate).format('DD/MM/YYYY') : undefined} />
        <Field label="Dặn dò tập tại nhà" value={data?.homeExerciseInstructions} />
      </div>

      <SignatureBlock leftTitle="BỆNH NHÂN" rightTitle="BÁC SĨ PHCN" date={data?.examDate} />
    </div>
  )
);
NgoaiTruPHCNBAPrint.displayName = 'NgoaiTruPHCNBAPrint';

// =====================================================================
// 27. PHIẾU KHÁM THEO YÊU CẦU (VIP / Service Exam)
// =====================================================================
export const KhamTheoYCPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 27/BV2" />
      <h2>PHIẾU KHÁM THEO YÊU CẦU</h2>
      <div style={{ textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>
        (Khám dịch vụ / VIP)
      </div>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="CCCD/CMND" value={data?.idNumber} /></div>
          <div className="col"><Field label="SĐT" value={data?.phoneNumber} /></div>
        </div>
        <Field label="Địa chỉ" value={data?.address} />
        <div className="row">
          <div className="col"><Field label="Nghề nghiệp" value={data?.occupation} /></div>
          <div className="col"><Field label="Đơn vị công tác" value={data?.company} /></div>
        </div>
        <Field label="Ngày khám" value={data?.examDate ? dayjs(data.examDate).format('DD/MM/YYYY HH:mm') : undefined} />
      </div>

      <div className="section">
        <div className="section-title">I. GÓI KHÁM</div>
        <Field label="Gói khám" value={data?.packageName} />
        <Field label="Yêu cầu bổ sung" value={data?.additionalRequests} />
      </div>

      <div className="section">
        <div className="section-title">II. LÝ DO KHÁM / TRIỆU CHỨNG</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ</div>
        <Field label="Bệnh đã mắc" value={data?.pastHistory} />
        <Field label="Dị ứng" value={data?.allergy} />
        <Field label="Gia đình" value={data?.familyHistory} />
        <Field label="Thuốc đang dùng" value={data?.currentMedications} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} l/p` : undefined} /></div>
          <div className="col"><Field label="HA" value={data?.bloodPressure} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Cân nặng" value={data?.weight ? `${data.weight} kg` : undefined} /></div>
          <div className="col"><Field label="Chiều cao" value={data?.height ? `${data.height} cm` : undefined} /></div>
          <div className="col"><Field label="BMI" value={data?.bmi} /></div>
        </div>
        <Field label="Nội khoa" value={data?.internalExam} />
        <Field label="Ngoại khoa" value={data?.surgicalExam} />
        <Field label="Mắt" value={data?.eyeExam} />
        <Field label="TMH" value={data?.entExam} />
        <Field label="RHM" value={data?.dentalExam} />
        <Field label="Da liễu" value={data?.skinExam} />
        <Field label="Phụ khoa (nữ)" value={data?.gynecologicalExam} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">V. CẬN LÂM SÀNG</div>
        <Field label="Xét nghiệm máu" value={data?.bloodTests} />
        <Field label="Xét nghiệm nước tiểu" value={data?.urineTests} />
        <Field label="X-quang" value={data?.xray} />
        <Field label="Siêu âm" value={data?.ultrasound} />
        <Field label="Điện tim" value={data?.ecg} />
        <Field label="Xét nghiệm khác" value={data?.otherTests} />
      </div>

      <div className="section">
        <div className="section-title">VI. KẾT LUẬN</div>
        <Field label="Phân loại sức khỏe" value={data?.healthClassification} />
        <Field label="Chẩn đoán (nếu có)" value={data?.diagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <DottedLines content={data?.conclusion} count={3} />
      </div>

      <div className="section">
        <div className="section-title">VII. LỜI KHUYÊN</div>
        <DottedLines content={data?.advice} count={3} />
        <Field label="Hẹn tái khám" value={data?.followUpDate ? dayjs(data.followUpDate).format('DD/MM/YYYY') : undefined} />
      </div>

      <SignatureBlock leftTitle="NGƯỜI KHÁM" rightTitle="BÁC SĨ KHÁM" date={data?.examDate} />
    </div>
  )
);
KhamTheoYCPrint.displayName = 'KhamTheoYCPrint';

// =====================================================================
// 28. PHIẾU KHÁM CHUYÊN KHOA (Specialty Outpatient Exam)
// =====================================================================
export const KhamCKPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 28/BV2" />
      <h2>PHIẾU KHÁM CHUYÊN KHOA NGOẠI TRÚ</h2>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={data?.patientCode} /></div>
          <div className="col"><Field label="Số BHYT" value={data?.insuranceNumber} /></div>
        </div>
        <Field label="Địa chỉ" value={data?.address} />
        <div className="row">
          <div className="col"><Field label="Ngày khám" value={data?.examDate ? dayjs(data.examDate).format('DD/MM/YYYY HH:mm') : undefined} /></div>
          <div className="col"><Field label="Chuyên khoa" value={data?.specialtyName} /></div>
        </div>
        <Field label="Nơi giới thiệu" value={data?.referralSource} />
      </div>

      <div className="section">
        <div className="section-title">I. LÝ DO KHÁM</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ TÓM TẮT</div>
        <DottedLines content={data?.historyOfPresentIllness} count={3} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ LIÊN QUAN</div>
        <Field label="Bệnh đã mắc" value={data?.pastHistory} />
        <Field label="Dị ứng" value={data?.allergy} />
        <Field label="Phẫu thuật" value={data?.surgicalHistory} />
        <Field label="Thuốc đang dùng" value={data?.currentMedications} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} l/p` : undefined} /></div>
          <div className="col"><Field label="HA" value={data?.bloodPressure} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
        </div>
        <Field label="Khám toàn thân" value={data?.generalExam} />
        <Field label="Khám chuyên khoa" value={data?.specialtyExam} />
        <DottedLines content={data?.specialtyExamDetail} count={5} />
      </div>

      <div className="section">
        <div className="section-title">V. CẬN LÂM SÀNG</div>
        <DottedLines content={data?.labResults} count={3} />
      </div>

      <div className="section">
        <div className="section-title">VI. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán chính" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Chẩn đoán phụ" value={data?.secondaryDiagnosis} />
      </div>

      <div className="section">
        <div className="section-title">VII. XỬ TRÍ</div>
        <DottedLines content={data?.treatment} count={4} />
      </div>

      <div className="section">
        <div className="section-title">VIII. ĐƠN THUỐC</div>
        {Array.isArray(data?.prescriptions) && data.prescriptions.length > 0 ? (
          <table>
            <thead><tr><th>STT</th><th>Tên thuốc</th><th>ĐVT</th><th>SL</th><th>Cách dùng</th></tr></thead>
            <tbody>
              {(data.prescriptions as unknown as Array<{ id?: string; medicineName?: string; unit?: string; quantity?: number | string; dosageInstruction?: string }>).map((rx, i) => (
                <tr key={rx.id || i}>
                  <td style={{ textAlign: 'center' }}>{i + 1}</td>
                  <td>{rx.medicineName}</td>
                  <td>{rx.unit}</td>
                  <td style={{ textAlign: 'center' }}>{rx.quantity}</td>
                  <td>{rx.dosageInstruction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <DottedLines count={4} />
        )}
      </div>

      <div className="section">
        <Field label="Hẹn tái khám" value={data?.followUpDate ? dayjs(data.followUpDate).format('DD/MM/YYYY') : undefined} />
        <Field label="Dặn dò" value={data?.instructions} />
      </div>

      <SignatureBlock leftTitle="BỆNH NHÂN" rightTitle="BÁC SĨ CHUYÊN KHOA" date={data?.examDate} />
    </div>
  )
);
KhamCKPrint.displayName = 'KhamCKPrint';

// =====================================================================
// 29. PHIẾU CHĂM SÓC CẤP 1 (Level 1 Nursing Care - Critical)
// =====================================================================
export const CSCap1Print = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 29/BV2" />
      <h2>PHIẾU CHĂM SÓC CẤP 1</h2>
      <div style={{ textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>
        (Bệnh nhân nặng - Theo dõi liên tục 15-30 phút)
      </div>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={data?.patientCode} /></div>
          <div className="col"><Field label="Khoa" value={data?.departmentName} /></div>
          <div className="col"><Field label="Giường" value={data?.bedName} /></div>
        </div>
        <Field label="Chẩn đoán" value={data?.diagnosis} />
        <Field label="Ngày" value={data?.date ? dayjs(data.date).format('DD/MM/YYYY') : undefined} />
      </div>

      <div className="section">
        <div className="section-title">I. THEO DÕI SINH HIỆU LIÊN TỤC</div>
        <table>
          <thead>
            <tr>
              <th>Giờ</th>
              <th>Mạch (l/p)</th>
              <th>HA (mmHg)</th>
              <th>Nhịp thở (l/p)</th>
              <th>SpO2 (%)</th>
              <th>Nhiệt độ (°C)</th>
              <th>GCS</th>
              <th>Nước tiểu (ml)</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {(((data?.vitalSignsRecords as unknown as RowAny[] | undefined) ?? []).length > 0
              ? (data!.vitalSignsRecords as unknown as RowAny[])
              : (Array.from({ length: 12 }) as RowAny[])
            ).map((record, i) => (
              <tr key={rowKey(record, i)}>
                <td style={{ textAlign: 'center' }}>{cell(record?.time)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.pulse)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.bloodPressure)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.respiratoryRate)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.spo2)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.temperature)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.gcs)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.urineOutput)}</td>
                <td>{cell(record?.note)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">II. THEO DÕI DỊCH TRUYỀN</div>
        <table>
          <thead>
            <tr><th>Giờ bắt đầu</th><th>Loại dịch</th><th>Thể tích (ml)</th><th>Tốc độ (gtts/p)</th><th>Giờ kết thúc</th><th>Phản ứng</th></tr>
          </thead>
          <tbody>
            {(((data?.infusionRecords as unknown as RowAny[] | undefined) ?? []).length > 0
              ? (data!.infusionRecords as unknown as RowAny[])
              : (Array.from({ length: 4 }) as RowAny[])
            ).map((record, i) => (
              <tr key={rowKey(record, i)}>
                <td>{cell(record?.startTime)}</td>
                <td>{cell(record?.fluidType)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.volume)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.rate)}</td>
                <td>{cell(record?.endTime)}</td>
                <td>{cell(record?.reaction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">III. THEO DÕI THUỐC</div>
        <table>
          <thead>
            <tr><th>Giờ</th><th>Tên thuốc</th><th>Liều</th><th>Đường dùng</th><th>Phản ứng</th><th>ĐD thực hiện</th></tr>
          </thead>
          <tbody>
            {(((data?.medicationRecords as unknown as RowAny[] | undefined) ?? []).length > 0
              ? (data!.medicationRecords as unknown as RowAny[])
              : (Array.from({ length: 6 }) as RowAny[])
            ).map((record, i) => (
              <tr key={rowKey(record, i)}>
                <td>{cell(record?.time)}</td>
                <td>{cell(record?.drugName)}</td>
                <td>{cell(record?.dose)}</td>
                <td>{cell(record?.route)}</td>
                <td>{cell(record?.reaction)}</td>
                <td>{cell(record?.nurseName)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">IV. NHẬN ĐỊNH ĐIỀU DƯỠNG</div>
        <Field label="Tình trạng bệnh nhân" value={data?.patientCondition} />
        <Field label="Ý thức" value={data?.consciousness} />
        <Field label="Đau (VAS)" value={data?.painScore} />
        <Field label="Da, niêm mạc" value={data?.skinStatus} />
        <Field label="Loét tỳ đè (Braden)" value={data?.bradenScore} />
        <Field label="Nguy cơ té ngã" value={data?.fallRisk} />
      </div>

      <div className="section">
        <div className="section-title">V. CAN THIỆP ĐIỀU DƯỠNG</div>
        <DottedLines content={data?.nursingInterventions} count={4} />
      </div>

      <div className="section">
        <div className="section-title">VI. DIỄN BIẾN ĐẶC BIỆT</div>
        <DottedLines content={data?.specialEvents} count={3} />
      </div>

      <div className="section">
        <div className="section-title">VII. TỔNG KẾT CA TRỰC</div>
        <div className="row">
          <div className="col"><Field label="Tổng dịch vào (ml)" value={data?.totalIntake} /></div>
          <div className="col"><Field label="Tổng nước tiểu (ml)" value={data?.totalUrineOutput} /></div>
          <div className="col"><Field label="Cân bằng (ml)" value={data?.fluidBalance} /></div>
        </div>
      </div>

      <SignatureBlock leftTitle="ĐIỀU DƯỠNG TRỰC" middleTitle="ĐIỀU DƯỠNG TRƯỞNG" rightTitle="BÁC SĨ TRỰC" date={data?.date} />
    </div>
  )
);
CSCap1Print.displayName = 'CSCap1Print';

// =====================================================================
// 30. PHIẾU CHĂM SÓC CẤP 2 (Level 2 Nursing Care - Intermediate)
// =====================================================================
export const CSCap2Print = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 30/BV2" />
      <h2>PHIẾU CHĂM SÓC CẤP 2</h2>
      <div style={{ textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>
        (Bệnh nhân trung bình - Theo dõi 1-2 giờ)
      </div>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={data?.patientCode} /></div>
          <div className="col"><Field label="Khoa" value={data?.departmentName} /></div>
          <div className="col"><Field label="Giường" value={data?.bedName} /></div>
        </div>
        <Field label="Chẩn đoán" value={data?.diagnosis} />
        <div className="row">
          <div className="col"><Field label="Ngày" value={data?.date ? dayjs(data.date).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Ca trực" value={data?.shift} /></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">I. SINH HIỆU (Theo dõi mỗi 1-2 giờ)</div>
        <table>
          <thead>
            <tr>
              <th>Giờ</th>
              <th>Mạch (l/p)</th>
              <th>HA (mmHg)</th>
              <th>Nhịp thở (l/p)</th>
              <th>Nhiệt độ (°C)</th>
              <th>SpO2 (%)</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {(((data?.vitalSignsRecords as unknown as RowAny[] | undefined) ?? []).length > 0
              ? (data!.vitalSignsRecords as unknown as RowAny[])
              : (Array.from({ length: 8 }) as RowAny[])
            ).map((record, i) => (
              <tr key={rowKey(record, i)}>
                <td style={{ textAlign: 'center' }}>{cell(record?.time)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.pulse)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.bloodPressure)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.respiratoryRate)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.temperature)}</td>
                <td style={{ textAlign: 'center' }}>{cell(record?.spo2)}</td>
                <td>{cell(record?.note)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">II. NHẬN ĐỊNH TÌNH TRẠNG BỆNH NHÂN</div>
        <Field label="Ý thức" value={data?.consciousness} />
        <Field label="Đau" value={data?.pain} />
        <Field label="Ăn uống" value={data?.nutrition} />
        <Field label="Vận động" value={data?.mobility} />
        <Field label="Vệ sinh cá nhân" value={data?.hygiene} />
        <Field label="Giấc ngủ" value={data?.sleep} />
        <Field label="Tình trạng da, vết mổ" value={data?.skinWound} />
        <Field label="Đại/tiểu tiện" value={data?.elimination} />
      </div>

      <div className="section">
        <div className="section-title">III. THỰC HIỆN Y LỆNH</div>
        <table>
          <thead>
            <tr><th>Giờ</th><th>Y lệnh</th><th>Thực hiện</th><th>Kết quả</th><th>ĐD ký</th></tr>
          </thead>
          <tbody>
            {(((data?.orderRecords as unknown as RowAny[] | undefined) ?? []).length > 0
              ? (data!.orderRecords as unknown as RowAny[])
              : (Array.from({ length: 6 }) as RowAny[])
            ).map((record, i) => (
              <tr key={rowKey(record, i)}>
                <td>{cell(record?.time)}</td>
                <td>{cell(record?.order)}</td>
                <td>{cell(record?.execution)}</td>
                <td>{cell(record?.result)}</td>
                <td>{cell(record?.nurseSig)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">IV. CHĂM SÓC ĐIỀU DƯỠNG</div>
        <div className="checkbox-row">
          <Checkbox label="Vệ sinh thân thể" checked={data?.bodyHygiene} />
          <Checkbox label="Thay ga, quần áo" checked={data?.linenChange} />
          <Checkbox label="Xoay trở" checked={data?.positioning} />
          <Checkbox label="Hỗ trợ ăn uống" checked={data?.feedingAssist} />
        </div>
        <div className="checkbox-row">
          <Checkbox label="Hướng dẫn tập vận động" checked={data?.exerciseGuidance} />
          <Checkbox label="Giáo dục sức khỏe" checked={data?.healthEducation} />
          <Checkbox label="Tư vấn dinh dưỡng" checked={data?.nutritionCounseling} />
          <Checkbox label="Hỗ trợ tâm lý" checked={data?.psychologicalSupport} />
        </div>
        <DottedLines content={data?.additionalCare} count={3} />
      </div>

      <div className="section">
        <div className="section-title">V. ĐÁNH GIÁ</div>
        <Field label="Tình trạng so với đầu ca" value={data?.progressAssessment} />
        <div className="checkbox-row">
          <Checkbox label="Ổn định" checked={data?.stable} />
          <Checkbox label="Tiến triển tốt" checked={data?.improving} />
          <Checkbox label="Nặng hơn" checked={data?.worsening} />
        </div>
        <Field label="Vấn đề cần lưu ý ca sau" value={data?.handoverNotes} />
      </div>

      <div className="section">
        <div className="section-title">VI. BÀN GIAO CA</div>
        <div className="row">
          <div className="col"><Field label="Ca trực giao" value={data?.handoverFromShift} /></div>
          <div className="col"><Field label="Ca trực nhận" value={data?.handoverToShift} /></div>
        </div>
        <Field label="Nội dung bàn giao" value={data?.handoverContent} />
      </div>

      <SignatureBlock leftTitle="ĐD GIAO CA" middleTitle="ĐD NHẬN CA" rightTitle="ĐD TRƯỞNG KHOA" date={data?.date} />
    </div>
  )
);
CSCap2Print.displayName = 'CSCap2Print';
