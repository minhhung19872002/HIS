import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../../constants/hospital';
import type { MedicalRecordFullDto, TreatmentSheetDto, ConsultationRecordDto, NursingCareSheetDto } from '../../api/examination';
import type { DocumentSignatureDto } from '../../api/digitalSignature';
import { printStyles, PrintHeader, SignatureBlock, Field, CheckMarkSvg, DigitalSignatureStamp, toSignatureStamp } from './_shared';
import type { SignatureStampInfo } from './_shared';
interface AdmissionExamProps { record?: MedicalRecordFullDto | null; }
export const AdmissionExamPrint = forwardRef<HTMLDivElement, AdmissionExamProps>(
  ({ record }, ref) => {
    const p = record?.patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 17/BV" />
        <h2>PHIẾU KHÁM VÀO VIỆN</h2>
        <div className="section">
          <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div><div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : undefined} /></div></div>
          <div className="row"><div className="col"><Field label="Nghề nghiệp" /></div><div className="col"><Field label="Dân tộc" /></div></div>
          <Field label="Địa chỉ" value={p?.address} />
          <div className="row"><div className="col"><Field label="Nơi giới thiệu" /></div><div className="col"><Field label="Ngày vào viện" /></div></div>
        </div>
        <div className="section">
          <div className="section-title">I. LÝ DO VÀO VIỆN</div>
          <Field label="Lý do" />
        </div>
        <div className="section">
          <div className="section-title">II. BỆNH SỬ</div>
          <Field label="Quá trình bệnh lý" />
          <div style={{ minHeight: 60, border: '1px dotted #999', margin: '4px 0', padding: 4 }} />
        </div>
        <div className="section">
          <div className="section-title">III. TIỀN SỬ</div>
          <Field label="Bản thân" />
          <Field label="Gia đình" />
          <Field label="Dị ứng" value={record?.allergies?.map(a => a.allergenName).join(', ') || 'Không'} />
        </div>
        <div className="section">
          <div className="section-title">IV. KHÁM LÂM SÀNG</div>
          <div className="row"><div className="col"><Field label="Mạch" /></div><div className="col"><Field label="Nhiệt độ" /></div><div className="col"><Field label="Huyết áp" /></div><div className="col"><Field label="Nhịp thở" /></div></div>
          <div className="row"><div className="col"><Field label="Chiều cao" /></div><div className="col"><Field label="Cân nặng" /></div><div className="col"><Field label="BMI" /></div></div>
          <h3>Khám các cơ quan:</h3>
          <Field label="Toàn thân" />
          <Field label="Tuần hoàn" />
          <Field label="Hô hấp" />
          <Field label="Tiêu hoá" />
          <Field label="Thận - Tiết niệu" />
          <Field label="Thần kinh" />
          <Field label="Cơ xương khớp" />
          <Field label="Tai mũi họng" />
          <Field label="Mắt" />
          <Field label="Răng hàm mặt" />
          <Field label="Khác" />
        </div>
        <div className="section">
          <div className="section-title">V. TÓM TẮT KẾT QUẢ CẬN LÂM SÀNG</div>
          <div style={{ minHeight: 40, border: '1px dotted #999', margin: '4px 0', padding: 4 }} />
        </div>
        <div className="section">
          <div className="section-title">VI. CHẨN ĐOÁN</div>
          <Field label="Chẩn đoán sơ bộ" value={record?.diagnoses?.[0]?.icdName} />
          <Field label="Chẩn đoán phân biệt" />
          <Field label="Hướng điều trị" />
        </div>
        <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ KHÁM" date={new Date()} />
      </div>
    );
  }
);
AdmissionExamPrint.displayName = 'AdmissionExamPrint';

// ============================================================
// MS. 18/BV - Bệnh án Sản khoa (Obstetrics Medical Record)
// ============================================================
interface ObstetricsMedicalRecordProps { record?: MedicalRecordFullDto | null; patient?: any; }
export const ObstetricsMedicalRecordPrint = forwardRef<HTMLDivElement, ObstetricsMedicalRecordProps>(
  ({ record, patient }, ref) => {
    const p = record?.patient || patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 18/BV" />
        <h2>BỆNH ÁN SẢN KHOA</h2>

        <div className="section">
          <div className="section-title">I. THÔNG TIN BỆNH NHÂN</div>
          <div className="row">
            <div className="col"><Field label="Họ tên" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div>
            <div className="col"><Field label="Giới" value="Nữ" /></div>
          </div>
          <Field label="Địa chỉ" value={p?.address} />
          <div className="row">
            <div className="col"><Field label="Số BHYT" value={p?.insuranceNumber} /></div>
            <div className="col"><Field label="Nghề nghiệp" /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Dân tộc" /></div>
            <div className="col"><Field label="Ngày vào viện" /></div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">II. TIỀN SỬ SẢN KHOA</div>
          <div className="row">
            <div className="col"><Field label="PARA (G_P_)" /></div>
            <div className="col"><Field label="Số lần sinh sống" /></div>
          </div>
          <Field label="Kinh cuối (LMP)" />
          <Field label="Ngày dự sinh (EDD)" />
          <Field label="Tiền sử sản khoa trước" />
          <Field label="Tiền sử phụ khoa" />
          <Field label="Tiền sử bệnh lý" />
          <Field label="Dị ứng" value={record?.allergies?.map(a => a.allergenName).join(', ') || 'Không'} />
        </div>

        <div className="section">
          <div className="section-title">III. THAI KỲ HIỆN TẠI</div>
          <div className="row">
            <div className="col"><Field label="Tuổi thai (tuần)" /></div>
            <div className="col"><Field label="Số thai" /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Ngôi thai" /></div>
            <div className="col"><Field label="Tim thai (lần/phút)" /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Chiều cao tử cung (cm)" /></div>
            <div className="col"><Field label="Vòng bụng (cm)" /></div>
          </div>
          <Field label="Cử động thai" />
          <Field label="Nước ối (siêu âm)" />
          <Field label="Nhau (vị trí, bất thường)" />
        </div>

        <div className="section">
          <div className="section-title">IV. DIỄN BIẾN CHUYỂN DẠ</div>
          <div className="row">
            <div className="col"><Field label="Thời điểm bắt đầu chuyển dạ" /></div>
            <div className="col"><Field label="Thời điểm vỡ ối" /></div>
          </div>
          <Field label="Tính chất nước ối" />
          <Field label="Diễn biến cổ tử cung" />
          <div className="row">
            <div className="col"><Field label="Phương pháp đẻ" /></div>
            <div className="col"><Field label="Chỉ định (nếu mổ)" /></div>
          </div>
          <Field label="Thuốc sử dụng trong chuyển dạ" />
          <Field label="Can thiệp (bấm ối, giảm đau, truyền oxytocin...)" />
        </div>

        <div className="section">
          <div className="section-title">V. KẾT QUẢ CUỘC ĐẺ</div>
          <div className="row">
            <div className="col"><Field label="Giới tính con" /></div>
            <div className="col"><Field label="Cân nặng (gram)" /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Apgar 1 phút" /></div>
            <div className="col"><Field label="Apgar 5 phút" /></div>
            <div className="col"><Field label="Apgar 10 phút" /></div>
          </div>
          <Field label="Dây rốn (bất thường)" />
          <Field label="Nhau thai (cân nặng, bất thường)" />
          <Field label="Biến chứng mẹ" />
          <Field label="Biến chứng con" />
          <Field label="Tầng sinh môn (rách, cắt)" />
        </div>

        <div className="section">
          <div className="section-title">VI. THEO DÕI SAU ĐẺ</div>
          <div className="row">
            <div className="col"><Field label="Co hồi tử cung" /></div>
            <div className="col"><Field label="Mất máu ước lượng (ml)" /></div>
          </div>
          <Field label="Ra huyết bất thường" />
          <Field label="Bú mẹ sớm (da kề da)" />
          <Field label="Tiểu tiện sau đẻ" />
          <Field label="Tình trạng sản phụ khi ra viện" />
          <Field label="Hướng dẫn sau đẻ" />
        </div>

        <div className="section">
          <div className="section-title">VII. CHẨN ĐOÁN</div>
          <Field label="Chẩn đoán sản khoa" value={record?.diagnoses?.[0]?.icdName} />
          <Field label="Bệnh kèm theo" />
        </div>

        <SignatureBlock leftTitle="BÁC SĨ SẢN KHOA" rightTitle="NỮ HỘ SINH" date={new Date()} />
      </div>
    );
  }
);
ObstetricsMedicalRecordPrint.displayName = 'ObstetricsMedicalRecordPrint';

// ============================================================
// MS. 19/BV - Bệnh án Sơ sinh (Neonatal Medical Record)
// ============================================================
interface NeonatalMedicalRecordProps { record?: MedicalRecordFullDto | null; patient?: any; }
export const NeonatalMedicalRecordPrint = forwardRef<HTMLDivElement, NeonatalMedicalRecordProps>(
  ({ record, patient }, ref) => {
    const p = record?.patient || patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 19/BV" />
        <h2>BỆNH ÁN SƠ SINH</h2>

        <div className="section">
          <div className="section-title">I. THÔNG TIN MẸ</div>
          <div className="row">
            <div className="col"><Field label="Họ tên mẹ" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi mẹ" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div>
          </div>
          <Field label="Địa chỉ" value={p?.address} />
          <Field label="Tiền sử sản khoa (PARA)" />
          <Field label="Bệnh lý trong thai kỳ" />
          <Field label="Thuốc sử dụng khi mang thai" />
          <div className="row">
            <div className="col"><Field label="Phương pháp đẻ" /></div>
            <div className="col"><Field label="Tuổi thai khi sinh (tuần)" /></div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">II. THÔNG TIN LÚC SINH</div>
          <div className="row">
            <div className="col"><Field label="Ngày giờ sinh" /></div>
            <div className="col"><Field label="Giới tính" /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Cân nặng (gram)" /></div>
            <div className="col"><Field label="Chiều dài (cm)" /></div>
            <div className="col"><Field label="Vòng đầu (cm)" /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Apgar 1 phút" /></div>
            <div className="col"><Field label="Apgar 5 phút" /></div>
            <div className="col"><Field label="Apgar 10 phút" /></div>
          </div>
          <Field label="Nước ối (trong/đục/có phân su)" />
          <Field label="Dây rốn (bất thường)" />
        </div>

        <div className="section">
          <div className="section-title">III. HỒI SỨC SƠ SINH</div>
          <Field label="Cần hồi sức" />
          <Field label="Các bước hồi sức đã thực hiện" />
          <table>
            <thead>
              <tr>
                <th>Bước</th>
                <th>Thời gian</th>
                <th>Nội dung</th>
                <th>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1</td><td></td><td>Lau khô, ủ ấm, kích thích</td><td></td></tr>
              <tr><td>2</td><td></td><td>Hút đờm dãi</td><td></td></tr>
              <tr><td>3</td><td></td><td>Thổi ngạt / Bóp bóng qua mask</td><td></td></tr>
              <tr><td>4</td><td></td><td>Đặt nội khí quản</td><td></td></tr>
              <tr><td>5</td><td></td><td>Ép tim / Thuốc</td><td></td></tr>
            </tbody>
          </table>
        </div>

        <div className="section">
          <div className="section-title">IV. KHÁM LÂM SÀNG SƠ SINH</div>
          <div className="row">
            <div className="col"><Field label="Màu da" /></div>
            <div className="col"><Field label="Trương lực cơ" /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Phản xạ" /></div>
            <div className="col"><Field label="Tiếng khóc" /></div>
          </div>
          <Field label="Bú mẹ" />
          <Field label="Rốn" />
          <Field label="Hậu môn" />
          <Field label="Dị tật bẩm sinh" />
          <div className="row">
            <div className="col"><Field label="Nhịp thở" /></div>
            <div className="col"><Field label="Nhịp tim" /></div>
            <div className="col"><Field label="Nhiệt độ" /></div>
            <div className="col"><Field label="SpO2" /></div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">V. SÀNG LỌC SƠ SINH</div>
          <div className="row">
            <div className="col"><Field label="Sàng lọc thính giác" /></div>
            <div className="col"><Field label="Kết quả" /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Sàng lọc chuyển hóa (gót chân)" /></div>
            <div className="col"><Field label="Kết quả" /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Sàng lọc tim bẩm sinh (SpO2)" /></div>
            <div className="col"><Field label="Kết quả" /></div>
          </div>
          <Field label="Sàng lọc khác" />
        </div>

        <div className="section">
          <div className="section-title">VI. CHẨN ĐOÁN VÀ ĐIỀU TRỊ</div>
          <Field label="Chẩn đoán" value={record?.diagnoses?.[0]?.icdName} />
          <Field label="Chẩn đoán phân biệt" />
          <Field label="Hướng điều trị" />
          <Field label="Dinh dưỡng" />
          <Field label="Theo dõi" />
        </div>

        <SignatureBlock leftTitle="BS NHI SƠ SINH" rightTitle="ĐIỀU DƯỠNG" date={new Date()} />
      </div>
    );
  }
);
NeonatalMedicalRecordPrint.displayName = 'NeonatalMedicalRecordPrint';

// ============================================================
// MS. 20/BV - Bệnh án Nhi khoa (Pediatric Medical Record)
// ============================================================
interface PediatricMedicalRecordProps { record?: MedicalRecordFullDto | null; patient?: any; }
export const PediatricMedicalRecordPrint = forwardRef<HTMLDivElement, PediatricMedicalRecordProps>(
  ({ record, patient }, ref) => {
    const p = record?.patient || patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 20/BV" />
        <h2>BỆNH ÁN NHI KHOA</h2>

        <div className="section">
          <div className="section-title">I. THÔNG TIN BỆNH NHI</div>
          <div className="row">
            <div className="col"><Field label="Họ tên" value={p?.fullName} /></div>
            <div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : undefined} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Ngày sinh" value={p?.dateOfBirth ? dayjs(p.dateOfBirth).format('DD/MM/YYYY') : undefined} /></div>
            <div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + ' tuổi' : undefined} /></div>
          </div>
          <Field label="Địa chỉ" value={p?.address} />
        </div>

        <div className="section">
          <div className="section-title">II. THÔNG TIN NGƯỜI GIÁM HỘ</div>
          <div className="row">
            <div className="col"><Field label="Họ tên cha/mẹ" /></div>
            <div className="col"><Field label="Số điện thoại" value={p?.phoneNumber} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Quan hệ" /></div>
            <div className="col"><Field label="CCCD/CMND" /></div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">III. PHÁT TRIỂN THỂ CHẤT</div>
          <div className="row">
            <div className="col"><Field label="Cân nặng (kg)" /></div>
            <div className="col"><Field label="Chiều cao (cm)" /></div>
            <div className="col"><Field label="Vòng đầu (cm)" /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Bách phân vị cân nặng (%ile)" /></div>
            <div className="col"><Field label="Bách phân vị chiều cao (%ile)" /></div>
            <div className="col"><Field label="BMI" /></div>
          </div>
          <Field label="Đánh giá dinh dưỡng (SDD/BT/Thừa cân/Béo phì)" />
        </div>

        <div className="section">
          <div className="section-title">IV. TIỀN SỬ TIÊM CHỦNG</div>
          <table>
            <thead>
              <tr>
                <th>Vaccine</th>
                <th>Ngày tiêm</th>
                <th>Mũi</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>BCG</td><td></td><td></td><td></td></tr>
              <tr><td>Viêm gan B</td><td></td><td></td><td></td></tr>
              <tr><td>DPT-VGB-Hib (5 trong 1)</td><td></td><td></td><td></td></tr>
              <tr><td>Bại liệt (OPV/IPV)</td><td></td><td></td><td></td></tr>
              <tr><td>Sởi - Rubella</td><td></td><td></td><td></td></tr>
              <tr><td>Viêm não Nhật Bản</td><td></td><td></td><td></td></tr>
              <tr><td>Khác</td><td></td><td></td><td></td></tr>
            </tbody>
          </table>
        </div>

        <div className="section">
          <div className="section-title">V. CÁC MỐC PHÁT TRIỂN</div>
          <div className="row">
            <div className="col"><Field label="Lẫy (tháng)" /></div>
            <div className="col"><Field label="Ngồi (tháng)" /></div>
            <div className="col"><Field label="Bò (tháng)" /></div>
            <div className="col"><Field label="Đi (tháng)" /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Nói từ đơn (tháng)" /></div>
            <div className="col"><Field label="Nói câu (tháng)" /></div>
          </div>
          <Field label="Đánh giá phát triển tâm vận động" />
          <Field label="Bất thường phát triển (nếu có)" />
        </div>

        <div className="section">
          <div className="section-title">VI. TIỀN SỬ BỆNH</div>
          <Field label="Tiền sử bản thân" />
          <Field label="Tiền sử gia đình" />
          <Field label="Dị ứng" value={record?.allergies?.map(a => a.allergenName).join(', ') || 'Không'} />
          <Field label="Tiền sử sinh" />
        </div>

        <div className="section">
          <div className="section-title">VII. BỆNH HIỆN TẠI</div>
          <Field label="Lý do khám" />
          <Field label="Bệnh sử" />
          <div style={{ minHeight: 60, border: '1px dotted #999', margin: '4px 0', padding: 4 }} />
        </div>

        <div className="section">
          <div className="section-title">VIII. KHÁM LÂM SÀNG</div>
          <div className="row">
            <div className="col"><Field label="Mạch" /></div>
            <div className="col"><Field label="Nhiệt độ" /></div>
            <div className="col"><Field label="Nhịp thở" /></div>
            <div className="col"><Field label="SpO2" /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Huyết áp" /></div>
            <div className="col"><Field label="Cân nặng" /></div>
          </div>
          <Field label="Toàn thân" />
          <Field label="Hô hấp" />
          <Field label="Tuần hoàn" />
          <Field label="Tiêu hóa" />
          <Field label="Thần kinh" />
          <Field label="Da, niêm mạc" />
          <Field label="Tai mũi họng" />
          <Field label="Cơ xương khớp" />
          <Field label="Khác" />
        </div>

        <div className="section">
          <div className="section-title">IX. CHẨN ĐOÁN</div>
          <Field label="Chẩn đoán chính" value={record?.diagnoses?.[0]?.icdName} />
          <Field label="Chẩn đoán phân biệt" />
          <Field label="Chẩn đoán kèm theo" />
        </div>

        <div className="section">
          <div className="section-title">X. HƯỚNG ĐIỀU TRỊ</div>
          <Field label="Phương pháp điều trị" />
          <Field label="Thuốc" />
          <Field label="Hướng dẫn dinh dưỡng" />
          <Field label="Hẹn tái khám" />
          <Field label="Hướng dẫn cha mẹ" />
        </div>

        <SignatureBlock leftTitle="BS NHI KHOA" rightTitle="ĐIỀU DƯỠNG" date={new Date()} />
      </div>
    );
  }
);
PediatricMedicalRecordPrint.displayName = 'PediatricMedicalRecordPrint';
