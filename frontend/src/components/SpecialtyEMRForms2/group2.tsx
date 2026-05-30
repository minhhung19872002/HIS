import { forwardRef } from 'react';
import dayjs from 'dayjs';
import { printStyles, PrintHeader, SignatureBlock, Field, Checkbox, DottedLines, PatientInfoBlock, type SpecialtyEMRPrintData } from './_shared';
export const MatLeoPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 21/BV1" />
      <h2>BỆNH ÁN MẮT - LÉ</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ VÀ TIỀN SỬ</div>
        <Field label="Tuổi khởi phát lé" value={data?.strabismusOnsetAge} />
        <Field label="Loại lé phát hiện" value={data?.strabismusType} />
        <Field label="Lé liên tục hay từng lúc" value={data?.frequency} />
        <Field label="Phẫu thuật lé trước đó" value={data?.previousSurgery} />
        <Field label="Đeo kính / che mắt" value={data?.glassesOcclusion} />
        <Field label="Tiền sử sinh, phát triển" value={data?.birthDevelopmentHistory} />
      </div>

      <div className="section">
        <div className="section-title">III. THỊ LỰC</div>
        <table>
          <thead><tr><th></th><th>Mắt phải</th><th>Mắt trái</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Không kính</td><td>{data?.vaRightUncorrected || '...'}</td><td>{data?.vaLeftUncorrected || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Có kính</td><td>{data?.vaRightCorrected || '...'}</td><td>{data?.vaLeftCorrected || '...'}</td></tr>
          </tbody>
        </table>
        <Field label="Nhược thị" value={data?.amblyopia} />
      </div>

      <div className="section">
        <div className="section-title">IV. ĐỘ LÉ</div>
        <table>
          <thead><tr><th>Vị trí nhìn</th><th>Nhìn xa (6m)</th><th>Nhìn gần (33cm)</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Không kính</td><td>{data?.deviationDistNoGlasses || '...'} PD</td><td>{data?.deviationNearNoGlasses || '...'} PD</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Có kính</td><td>{data?.deviationDistWithGlasses || '...'} PD</td><td>{data?.deviationNearWithGlasses || '...'} PD</td></tr>
          </tbody>
        </table>
        <Field label="Loại lé" value={data?.strabismusClassification} />
        <div className="checkbox-row">
          <Checkbox label="Lé trong (esotropia)" checked={data?.esotropia} />
          <Checkbox label="Lé ngoài (exotropia)" checked={data?.exotropia} />
          <Checkbox label="Lé trên (hypertropia)" checked={data?.hypertropia} />
          <Checkbox label="Lé dưới (hypotropia)" checked={data?.hypotropia} />
        </div>
      </div>

      <div className="section">
        <div className="section-title">V. TEST COVER</div>
        <Field label="Cover test nhìn xa" value={data?.coverTestDistance} />
        <Field label="Cover test nhìn gần" value={data?.coverTestNear} />
        <Field label="Alternate cover test" value={data?.alternateCoverTest} />
        <Field label="Mắt cố định" value={data?.fixatingEye} />
      </div>

      <div className="section">
        <div className="section-title">VI. WORTH 4-DOT TEST</div>
        <Field label="Nhìn xa" value={data?.worth4DotDistance} />
        <Field label="Nhìn gần" value={data?.worth4DotNear} />
        <Field label="Kết luận (hợp thị / ức chế / song thị)" value={data?.worth4DotConclusion} />
      </div>

      <div className="section">
        <div className="section-title">VII. VẬN NHÃN</div>
        <Field label="Vận nhãn 9 hướng nhìn" value={data?.ductionsVersions} />
        <Field label="Quá hoạt / yếu cơ" value={data?.overactionUnderaction} />
        <Field label="A/V pattern" value={data?.avPattern} />
      </div>

      <div className="section">
        <div className="section-title">VIII. KHÚC XẠ (sau liệt điều tiết)</div>
        <div className="row">
          <div className="col"><Field label="MP" value={data?.cycloRefractionRight} /></div>
          <div className="col"><Field label="MT" value={data?.cycloRefractionLeft} /></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">IX. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">X. HƯỚNG ĐIỀU TRỊ</div>
        <div className="checkbox-row">
          <Checkbox label="Kính" checked={data?.planGlasses} />
          <Checkbox label="Che mắt" checked={data?.planOcclusion} />
          <Checkbox label="Phẫu thuật" checked={data?.planSurgery} />
          <Checkbox label="Tiêm botox" checked={data?.planBotox} />
        </div>
        <DottedLines content={data?.treatmentPlan} count={3} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
MatLeoPrint.displayName = 'MatLeoPrint';

// =====================================================================
// 22. MẮT VÕNG MẠC - CHÁNH BỆNH (Retina - Choroid)
// =====================================================================
export const MatVMCBPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 22/BV1" />
      <h2>BỆNH ÁN MẮT - VÕNG MẠC DỊCH KÍNH</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ VÀ TIỀN SỬ</div>
        <DottedLines content={data?.historyOfPresentIllness} count={3} />
        <Field label="Bệnh toàn thân (ĐTĐ, THA)" value={data?.systemicDisease} />
        <Field label="HbA1c gần nhất" value={data?.hba1c} />
        <Field label="Tiền sử laser/tiêm nội nhãn" value={data?.previousRetinalTreatment} />
      </div>

      <div className="section">
        <div className="section-title">III. THỊ LỰC VÀ NHÃN ÁP</div>
        <table>
          <thead><tr><th></th><th>Mắt phải</th><th>Mắt trái</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Thị lực (có kính tốt nhất)</td><td>{data?.bcvaRight || '...'}</td><td>{data?.bcvaLeft || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Nhãn áp (mmHg)</td><td>{data?.iopRight || '...'}</td><td>{data?.iopLeft || '...'}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">IV. SOI ĐÁY MẮT</div>
        <h3>Mắt phải</h3>
        <Field label="Dịch kính" value={data?.rightVitreous} />
        <Field label="Gai thị" value={data?.rightOpticDisc} />
        <Field label="Mạch máu" value={data?.rightVessels} />
        <Field label="Hoàng điểm" value={data?.rightMacula} />
        <Field label="Võng mạc ngoại vi" value={data?.rightPeriphery} />
        <Field label="Tân mạch" value={data?.rightNeovascularization} />

        <h3>Mắt trái</h3>
        <Field label="Dịch kính" value={data?.leftVitreous} />
        <Field label="Gai thị" value={data?.leftOpticDisc} />
        <Field label="Mạch máu" value={data?.leftVessels} />
        <Field label="Hoàng điểm" value={data?.leftMacula} />
        <Field label="Võng mạc ngoại vi" value={data?.leftPeriphery} />
        <Field label="Tân mạch" value={data?.leftNeovascularization} />
      </div>

      <div className="section">
        <div className="section-title">V. CHỤP HUỲNH QUANG (FA/ICG)</div>
        <Field label="FA mắt phải" value={data?.faRight} />
        <Field label="FA mắt trái" value={data?.faLeft} />
        <Field label="ICG" value={data?.icg} />
        <Field label="Vùng thiếu máu" value={data?.ischemicArea} />
        <Field label="Rò huỳnh quang" value={data?.fluoresceinLeakage} />
      </div>

      <div className="section">
        <div className="section-title">VI. OCT HOÀNG ĐIỂM</div>
        <div className="row">
          <div className="col"><Field label="MP - CMT" value={data?.cmtRight ? `${data.cmtRight} µm` : undefined} /></div>
          <div className="col"><Field label="MT - CMT" value={data?.cmtLeft ? `${data.cmtLeft} µm` : undefined} /></div>
        </div>
        <Field label="Mô tả OCT MP" value={data?.octDescriptionRight} />
        <Field label="Mô tả OCT MT" value={data?.octDescriptionLeft} />
        <Field label="Phù hoàng điểm" value={data?.maculaEdema} />
        <Field label="Bong thanh dịch" value={data?.srd} />
      </div>

      <div className="section">
        <div className="section-title">VII. CHẨN ĐOÁN</div>
        <Field label="Mắt phải" value={data?.diagnosisRight} />
        <Field label="Mắt trái" value={data?.diagnosisLeft} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Phân loại (nếu BVMĐTĐ)" value={data?.drClassification} />
      </div>

      <div className="section">
        <div className="section-title">VIII. HƯỚNG ĐIỀU TRỊ</div>
        <div className="checkbox-row">
          <Checkbox label="Laser quang đông" checked={data?.planLaser} />
          <Checkbox label="Tiêm nội nhãn anti-VEGF" checked={data?.planAntiVEGF} />
          <Checkbox label="Tiêm nội nhãn corticoid" checked={data?.planIntravitealSteroid} />
          <Checkbox label="Phẫu thuật cắt dịch kính" checked={data?.planVitrectomy} />
        </div>
        <Field label="Thuốc tiêm" value={data?.injectionDrug} />
        <Field label="Lịch tiêm" value={data?.injectionSchedule} />
        <DottedLines content={data?.treatmentPlan} count={3} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
MatVMCBPrint.displayName = 'MatVMCBPrint';

// =====================================================================
// 23. MẮT KHÚC XẠ - THỂ THỦY TINH (Refraction)
// =====================================================================
export const MatKXTPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 23/BV1" />
      <h2>BỆNH ÁN MẮT - KHÚC XẠ</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO KHÁM</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. TIỀN SỬ</div>
        <Field label="Đeo kính từ năm" value={data?.glassesStartYear} />
        <Field label="Số kính đang đeo" value={data?.currentGlasses} />
        <Field label="Kính tiếp xúc" value={data?.contactLens} />
        <Field label="Phẫu thuật khúc xạ trước" value={data?.previousRefractiveSurgery} />
      </div>

      <div className="section">
        <div className="section-title">III. ĐO KHÚC XẠ</div>
        <table>
          <thead><tr><th></th><th>Mắt phải</th><th>Mắt trái</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Tự động khúc xạ kế (AR)</td><td>{data?.arRight || '...'}</td><td>{data?.arLeft || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Khúc xạ chủ quan (manifest)</td><td>{data?.manifestRight || '...'}</td><td>{data?.manifestLeft || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Khúc xạ sau liệt ĐT (cyclo)</td><td>{data?.cycloRight || '...'}</td><td>{data?.cycloLeft || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>BCVA</td><td>{data?.bcvaRight || '...'}</td><td>{data?.bcvaLeft || '...'}</td></tr>
          </tbody>
        </table>
        <Field label="PD (khoảng cách đồng tử)" value={data?.pd ? `${data.pd} mm` : undefined} />
      </div>

      <div className="section">
        <div className="section-title">IV. TOPOGRAPHY GIÁC MẠC</div>
        <div className="row">
          <div className="col">
            <h3>Mắt phải</h3>
            <Field label="SimK steep" value={data?.topoRightSteep} />
            <Field label="SimK flat" value={data?.topoRightFlat} />
            <Field label="Pachymetry" value={data?.pachyRight ? `${data.pachyRight} µm` : undefined} />
          </div>
          <div className="col">
            <h3>Mắt trái</h3>
            <Field label="SimK steep" value={data?.topoLeftSteep} />
            <Field label="SimK flat" value={data?.topoLeftFlat} />
            <Field label="Pachymetry" value={data?.pachyLeft ? `${data.pachyLeft} µm` : undefined} />
          </div>
        </div>
        <Field label="Bản đồ giác mạc" value={data?.topographyNotes} />
      </div>

      <div className="section">
        <div className="section-title">V. CHẨN ĐOÁN</div>
        <Field label="Mắt phải" value={data?.diagnosisRight} />
        <Field label="Mắt trái" value={data?.diagnosisLeft} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <div className="checkbox-row">
          <Checkbox label="Cận thị" checked={data?.myopia} />
          <Checkbox label="Viễn thị" checked={data?.hyperopia} />
          <Checkbox label="Loạn thị" checked={data?.astigmatism} />
          <Checkbox label="Lão thị" checked={data?.presbyopia} />
        </div>
      </div>

      <div className="section">
        <div className="section-title">VI. KÊ KÍNH</div>
        <table>
          <thead><tr><th></th><th>Cầu (Sph)</th><th>Trụ (Cyl)</th><th>Trục (Axis)</th><th>Add</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>MP</td><td>{data?.rxRightSph || '...'}</td><td>{data?.rxRightCyl || '...'}</td><td>{data?.rxRightAxis || '...'}</td><td>{data?.rxRightAdd || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>MT</td><td>{data?.rxLeftSph || '...'}</td><td>{data?.rxLeftCyl || '...'}</td><td>{data?.rxLeftAxis || '...'}</td><td>{data?.rxLeftAdd || '...'}</td></tr>
          </tbody>
        </table>
        <Field label="Loại kính" value={data?.lensType} />
        <Field label="Lời dặn" value={data?.instructions} />
      </div>

      <SignatureBlock leftTitle="BỆNH NHÂN" rightTitle="BÁC SĨ KHÁM" date={data?.createdDate} />
    </div>
  )
);
MatKXTPrint.displayName = 'MatKXTPrint';

// =====================================================================
// 24. BA PHCN (Rehabilitation)
// =====================================================================
export const PHCNBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 24/BV1" />
      <h2>BỆNH ÁN PHỤC HỒI CHỨC NĂNG</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ</div>
        <Field label="Ngày khởi phát / chấn thương" value={data?.onsetDate ? dayjs(data.onsetDate).format('DD/MM/YYYY') : undefined} />
        <Field label="Chẩn đoán gốc" value={data?.originalDiagnosis} />
        <DottedLines content={data?.historyOfPresentIllness} count={3} />
        <Field label="Điều trị PHCN trước đó" value={data?.previousRehab} />
      </div>

      <div className="section">
        <div className="section-title">III. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} l/p` : undefined} /></div>
          <div className="col"><Field label="HA" value={data?.bloodPressure} /></div>
          <div className="col"><Field label="Cân nặng" value={data?.weight ? `${data.weight} kg` : undefined} /></div>
        </div>
        <Field label="Toàn trạng" value={data?.generalCondition} />
        <Field label="Thần kinh" value={data?.neuroExam} />
        <Field label="Cơ xương khớp" value={data?.mskExam} />
      </div>

      <div className="section">
        <div className="section-title">IV. ĐÁNH GIÁ CHỨC NĂNG</div>

        <h3>1. FIM (Functional Independence Measure)</h3>
        <table>
          <thead><tr><th>Lĩnh vực</th><th>Điểm vào</th><th>Mục tiêu</th></tr></thead>
          <tbody>
            <tr><td>Tự chăm sóc</td><td>{data?.fimSelfCareAdmit || '...'}</td><td>{data?.fimSelfCareGoal || '...'}</td></tr>
            <tr><td>Kiểm soát cơ vòng</td><td>{data?.fimSphincterAdmit || '...'}</td><td>{data?.fimSphincterGoal || '...'}</td></tr>
            <tr><td>Di chuyển</td><td>{data?.fimTransferAdmit || '...'}</td><td>{data?.fimTransferGoal || '...'}</td></tr>
            <tr><td>Vận động</td><td>{data?.fimLocomotionAdmit || '...'}</td><td>{data?.fimLocomotionGoal || '...'}</td></tr>
            <tr><td>Giao tiếp</td><td>{data?.fimCommunicationAdmit || '...'}</td><td>{data?.fimCommunicationGoal || '...'}</td></tr>
            <tr><td>Nhận thức xã hội</td><td>{data?.fimSocialCognitionAdmit || '...'}</td><td>{data?.fimSocialCognitionGoal || '...'}</td></tr>
            <tr style={{ fontWeight: 'bold' }}><td>TỔNG FIM</td><td>{data?.fimTotalAdmit || '...'}/126</td><td>{data?.fimTotalGoal || '...'}/126</td></tr>
          </tbody>
        </table>

        <h3>2. Barthel Index</h3>
        <Field label="Điểm Barthel vào viện" value={data?.barthelAdmit ? `${data.barthelAdmit}/100` : undefined} />
        <Field label="Mục tiêu" value={data?.barthelGoal ? `${data.barthelGoal}/100` : undefined} />

        <h3>3. Đánh giá bổ sung</h3>
        <Field label="Tầm vận động khớp (ROM)" value={data?.rom} />
        <Field label="Sức cơ (MMT)" value={data?.mmt} />
        <Field label="Trương lực cơ (Ashworth)" value={data?.ashworth} />
        <Field label="Thăng bằng (Berg)" value={data?.bergBalance} />
        <Field label="Đi bộ (6MWT / 10MWT)" value={data?.walkTest} />
        <Field label="Đau (VAS)" value={data?.painVas} />
      </div>

      <div className="section">
        <div className="section-title">V. CHẨN ĐOÁN PHCN</div>
        <Field label="Chẩn đoán bệnh" value={data?.medicalDiagnosis} />
        <Field label="Chẩn đoán chức năng" value={data?.functionalDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Mức độ khuyết tật" value={data?.disabilityLevel} />
      </div>

      <div className="section">
        <div className="section-title">VI. MỤC TIÊU PHCN</div>
        <Field label="Mục tiêu ngắn hạn (2 tuần)" value={data?.shortTermGoal} />
        <Field label="Mục tiêu dài hạn (3-6 tháng)" value={data?.longTermGoal} />
      </div>

      <div className="section">
        <div className="section-title">VII. CHƯƠNG TRÌNH TẬP</div>
        <div className="checkbox-row">
          <Checkbox label="Vật lý trị liệu" checked={data?.physicalTherapy} />
          <Checkbox label="Hoạt động trị liệu" checked={data?.occupationalTherapy} />
          <Checkbox label="Ngôn ngữ trị liệu" checked={data?.speechTherapy} />
          <Checkbox label="Dụng cụ chỉnh hình" checked={data?.orthotics} />
        </div>
        <DottedLines content={data?.rehabProgram} count={5} />
        <Field label="Tần suất" value={data?.frequency} />
        <Field label="Thời gian mỗi buổi" value={data?.sessionDuration} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" middleTitle="KTV PHCN" rightTitle="BÁC SĨ PHCN" date={data?.createdDate} />
    </div>
  )
);
PHCNBAPrint.displayName = 'PHCNBAPrint';

// =====================================================================
// 25. BA PHCN NHI (Pediatric Rehabilitation)
// =====================================================================
export const PHCNNhiBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 25/BV1" />
      <h2>BỆNH ÁN PHỤC HỒI CHỨC NĂNG NHI</h2>
      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ tên bệnh nhi" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Ngày sinh" value={data?.dateOfBirth ? dayjs(data.dateOfBirth).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
          <div className="col"><Field label="Mã BN" value={data?.patientCode} /></div>
        </div>
        <Field label="Họ tên bố/mẹ" value={data?.parentName} />
        <Field label="Địa chỉ" value={data?.address} />
        <Field label="SĐT" value={data?.phoneNumber} />
      </div>

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. TIỀN SỬ SẢN KHOA VÀ PHÁT TRIỂN</div>
        <Field label="Thai kỳ" value={data?.pregnancyHistory} />
        <Field label="Sinh (tuần, cân nặng, cách sinh)" value={data?.birthHistory} />
        <Field label="Ngạt lúc sinh" value={data?.birthAsphyxia} />
        <Field label="Vàng da sơ sinh" value={data?.neonatalJaundice} />
        <Field label="Lật" value={data?.rollingAge} />
        <Field label="Ngồi" value={data?.sittingAge} />
        <Field label="Đứng" value={data?.standingAge} />
        <Field label="Đi" value={data?.walkingAge} />
        <Field label="Nói" value={data?.speakingAge} />
      </div>

      <div className="section">
        <div className="section-title">III. ĐÁNH GIÁ PHÁT TRIỂN</div>

        <h3>Denver Test II</h3>
        <table>
          <thead><tr><th>Lĩnh vực</th><th>Kết quả</th><th>Tương đương tuổi</th></tr></thead>
          <tbody>
            <tr><td>Vận động thô</td><td>{data?.denverGrossMotor || '...'}</td><td>{data?.denverGrossMotorAge || '...'}</td></tr>
            <tr><td>Vận động tinh - thích ứng</td><td>{data?.denverFineMotor || '...'}</td><td>{data?.denverFineMotorAge || '...'}</td></tr>
            <tr><td>Ngôn ngữ</td><td>{data?.denverLanguage || '...'}</td><td>{data?.denverLanguageAge || '...'}</td></tr>
            <tr><td>Cá nhân - xã hội</td><td>{data?.denverPersonalSocial || '...'}</td><td>{data?.denverPersonalSocialAge || '...'}</td></tr>
          </tbody>
        </table>

        <h3>GMFCS (Bại não) nếu có</h3>
        <Field label="Mức GMFCS (I-V)" value={data?.gmfcsLevel} />
        <Field label="MACS (chức năng tay)" value={data?.macsLevel} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Cân nặng" value={data?.weight ? `${data.weight} kg` : undefined} /></div>
          <div className="col"><Field label="Chiều cao" value={data?.height ? `${data.height} cm` : undefined} /></div>
          <div className="col"><Field label="Vòng đầu" value={data?.headCircumference ? `${data.headCircumference} cm` : undefined} /></div>
        </div>
        <Field label="Trương lực cơ" value={data?.muscleTone} />
        <Field label="Phản xạ nguyên thủy" value={data?.primitiveReflexes} />
        <Field label="Biến dạng xương khớp" value={data?.deformities} />
        <Field label="Thị giác" value={data?.vision} />
        <Field label="Thính giác" value={data?.hearing} />
      </div>

      <div className="section">
        <div className="section-title">V. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán bệnh" value={data?.medicalDiagnosis} />
        <Field label="Chẩn đoán chức năng" value={data?.functionalDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">VI. CAN THIỆP SỚM</div>
        <div className="checkbox-row">
          <Checkbox label="Vật lý trị liệu" checked={data?.pt} />
          <Checkbox label="Hoạt động trị liệu" checked={data?.ot} />
          <Checkbox label="Ngôn ngữ trị liệu" checked={data?.st} />
          <Checkbox label="Giáo dục đặc biệt" checked={data?.specialEducation} />
          <Checkbox label="Tâm lý" checked={data?.psychology} />
        </div>
        <Field label="Mục tiêu ngắn hạn" value={data?.shortTermGoal} />
        <Field label="Mục tiêu dài hạn" value={data?.longTermGoal} />
        <DottedLines content={data?.interventionProgram} count={4} />
        <Field label="Hướng dẫn gia đình" value={data?.familyGuidance} />
      </div>

      <SignatureBlock leftTitle="PHỤ HUYNH" middleTitle="KTV PHCN" rightTitle="BÁC SĨ PHCN" date={data?.createdDate} />
    </div>
  )
);
PHCNNhiBAPrint.displayName = 'PHCNNhiBAPrint';

// =====================================================================
// 26. BA PHCN NGOẠI TRÚ (Outpatient Rehabilitation)
// =====================================================================
