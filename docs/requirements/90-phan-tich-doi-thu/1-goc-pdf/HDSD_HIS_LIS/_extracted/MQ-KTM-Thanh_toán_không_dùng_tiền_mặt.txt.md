# MQ-KTM-Thanh_toán_không_dùng_tiền_mặt.txt

```
===== PAGE 1 ===== (chars=305)
 CÔNG TY C Ổ PHẦN MQ SOLUTIONS  
Địa chỉ: 15/19/15 Ụ Ghe, P.Tam Phú, TP. Th ủ Đức, TP. H ồ Chí Minh  
Điện tho ại: 0822.451.451  
Email:  mqsoftvn@gmail.com  
Website:  www.mqsoft.vn  
 
 
 
GIẢI PHÁP  THANH TOÁN  
KHÔNG  TIỀN MẶT   
 
 
 
 
 
 
 
ĐỐI TÁC CÔNG TY  
 
 
 
 
 
 
 
 
 
 
Copyright © 2017  

===== PAGE 2 ===== (chars=437)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   2 
 BẢNG GHI THAY ĐỔI  
*A – Added M – Modified D – Deleted  
Ngày  Nội dung  Trạng thái  Người thực hiện Phiên b ản 
01/06/2020  Khởi tạo mới API  A PV.Bảo An, NV .Long  V1.0  
01/03/2021  Cập nhật thanh toán VNPAY  M NV.Long  V2.0  
03/06/2021  Cập nhật test case  M NLT .Phong  V2.1  
06/06/2021  Update t ủ trực F10 (nhà thu ốc) M NLT.Phong  V2.2  
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
===== PAGE 3 ===== (chars=5453)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   3 
 
MỤC LỤC 
I. TỔNG QUAN  ................................ ................................ ................................ ................................ ...... 5 
1.1. Cơ s ở pháp lý  ................................ ................................ ................................ ................................ ...............  5 
1.2. Các phương thức thanh toán  ................................ ................................ ................................ ......................  5 
1.3. Ph ạm vi áp d ụng ................................ ................................ ................................ ................................ ..........  5 
1.4. L ợi ích ................................ ................................ ................................ ................................ ...........................  5 
1.5. C ục CNTT đ ề xuất ................................ ................................ ................................ ................................ ...... 6 
II. GI ẢI PHÁP  ................................ ................................ ................................ ................................ ............  7 
2.1. Quy trình  ................................ ................................ ................................ ................................ ......................  7 
2.2. Nghi ệp vụ ................................ ................................ ................................ ................................ ......................  9 
2.2.1.  Đăng ký khám bệnh - Đối tượng thu phí  ................................ ................................ ..............................  9 
2.2.2.  CLS – Đối tượng thu phí ................................ ................................ ................................ .....................  11 
2.2.3.  Tạm ứng – Đối tượng thu phí  ................................ ................................ ................................ .............  15 
2.2.4.  BV02 – Đối tượng thu phí  ................................ ................................ ................................ ..................  17 
2.2.5.  Đăng ký khám b ệnh - Đối tượng dịch vụ ................................ ................................ ............................  20 
2.2.6.  CLS – Đối tượng dịch vụ ................................ ................................ ................................ ....................  22 
2.2.7.  Tạm ứng – Đối tượng dịch vụ ................................ ................................ ................................ .............  26 
2.2.8.  BV02 – Đối tượng dịch vụ ................................ ................................ ................................ ..................  28 
2.2.9.  Đăng ký khám b ệnh - Đối tượng BHYT ph ụ thu ................................ ................................ ................  31 
2.2.10.  CLS – Đối tượng BHYT  ................................ ................................ ................................ .....................  33 
2.2.11.  BV01 – Đối tượng BHYT  ................................ ................................ ................................ ...................  37 
2.2.12.  Đăng ký khám b ệnh - Đối tượng thu phí (phòng tiêm ng ừa) ................................ ..............................  39 
2.2.13.  CLS – Đối tượng thu phí (phòng tiêm ng ừa) ................................ ................................ ......................  40 
2.2.14.  Đăng ký khám b ệnh - Đối tượng BHYT (phòng khám ngo ại) ................................ ...........................  43 
2.2.15.  CLS – Đối tượng BHYT (phòng khám ngo ại) ................................ ................................ ....................  44 
2.2.16.  BV01 – Đối tượng BHYT  ................................ ................................ ................................ ...................  47 
2.2.17.  Hoàn tr ả công khám – Đối tượng thu phí  ................................ ................................ ...........................  48 
2.2.18.  Chỉ định CLS ở form đăng ký khám b ệnh ................................ ................................ ..........................  51 
2.2.19.  Khám 2 chuyên khoa – Đối tượng BHYT ph ụ thu ................................ ................................ .............  54 
2.2.20.  CLS – Đối tượng BHYT  ................................ ................................ ................................ .....................  57 
2.2.21.  In Bv01 – Đối tượng BHYT  ................................ ................................ ................................ ...............  63 
2.2.22.  Cho l ại chỉ định CLS – Đối tượng thu phí  ................................ ................................ ..........................  65 
2.2.23.  Đăng ký khám b ệnh - Đối tượng BHYT (Phòng lưu) ................................ ................................ .........  73 
2.2.24.  CLS – Đối tượng BHYT  ................................ ................................ ................................ .....................  76 
2.2.25. BV01 – Đối tượng BHYT  ................................ ................................ ................................ ...................  76 
2.2.26.  Đăng ký khám b ệnh - Đối tượng Thu phí (Phòng lưu)  ................................ ................................ ....... 78 
===== PAGE 4 ===== (chars=1818)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   4 
 2.2.27.  CLS – Đối tượng Thu phí  ................................ ................................ ................................ ...................  81 
2.2.28.  BV01 – Đối tượng Thu phí  ................................ ................................ ................................ .................  81 
2.3. Báo cáo  ................................ ................................ ................................ ................................ .....................  83 
2.3.1.  Báo cáo t ạm ứng VNPay  ................................ ................................ ................................ .....................  83 
2.3.2.  Báo cáo thu ti ền theo ngày – tổng hợp ................................ ................................ ................................  85 
2.3.3.  Báo cáo thu ti ền theo ngày – chi ti ết ................................ ................................ ................................ ... 86 
2.3.4.  Báo cáo HDDT – Sự nghiệp ................................ ................................ ................................ ...............  88 
2.3.5.  Báo cáo HDDT – Dịch vụ ................................ ................................ ................................ ...................  88 
2.3.6.  Báo cáo vi ện phí chi ti ết ................................ ................................ ................................ .....................  88 
2.3.7.  Báo cáo nhà thu ốc ................................ ................................ ................................ ...............................  89 
2.3.8.  Báo cáo  hoàn tr ả biên lai VNPAY  ................................ ................................ ................................ ...... 89 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
===== PAGE 5 ===== (chars=1688)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   5 
 I. TỔNG QUAN  
1.1. Cơ sở pháp lý  
- Căn c ứ quyết định số 2545/QĐ -TTg ngày 30 tháng 12 năm 2016 c ủa Chính ph ủ phê duy ệt đề án 
phát tri ển thanh toán không dùng ti ền mặt tại Việt Nam giai đo ạn 2016 -2020.  
- Căn c ứ quyết định 241/QĐ -TTg ngày 23 tháng 02 năm 2018 c ủa Chính Ph ủ phê duy ệt đề án đẩy 
mạnh thanh toán qua ngân hàng đ ối với các d ịch vụ công như: thu ế, điện, nư ớc, học phí , viện phí và chi 
trả các chương trình an ninh xã h ội. 
- Nghị quyết số 02/NQ -CP ngày 01/01/2019 c ủa Chính ph ủ về tiếp tục thực hiện những nhi ệm vụ, 
giải pháp c ải thiện môi trư ờng kinh doanh, nâng cao năng l ực cạnh tranh qu ốc gia 2019  và định hư ớng 
năm 2021.  Chính ph ủ yêu c ầu 100% trư ờng học, bệnh vi ện… trên đ ịa bàn đô th ị phải thu h ọc phí, vi ện phí 
bằng phương th ức thanh toán không dùng ti ền mặt, ưu tiên thanh toán trên thi ết bị di động, máy POS.  
1.2. Các phương thức thanh toán  
- Phương th ức chuy ển kho ản. 
- Phươn g thức sử dụng th ẻ quốc tế VISA, Master, JCB.  
- Phương th ức sử dụng th ẻ Napas.  
- Phương th ức qua ví đi ện tử. 
- Thẻ thanh toán c ủa Bệnh Vi ện. 
- Phương th ức thanh toán s ử dụng mã QR Code.  
1.3. Phạm vi áp dụng  
- Các khoa lâm sàng.  
- Các khoa c ận lâm sàng.  
- Phòng tài chính  kế toán.  
- Phòng k ế hoạch tổng hợp. 
- Khoa Dư ợc. 
1.4. Lợi ích  
 Đối với bệnh vi ện 
- Đơn gi ản hóa th ủ tục. 
- Phục vụ bệnh nhân t ốt hơn, không còn ph ải xếp hàng đ ợi thanh toán.  
- Giảm thi ểu rủi ro giao d ịch tiền mặt (nhầm lẫn, thống kê, đ ối soát).  
- Giảm chi phí qu ản lý, kiểm đếm, in ấn đơn/phi ếu. 
- Tiết kiệm chi phí, nhân l ực, giúp B ệnh Vi ện quản trị hiệu quả. 
===== PAGE 6 ===== (chars=957)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   6 
 
 Đối với ngư ời dân  
- Dề dàng và thu ận tiện trong thanh toán.  
- Giảm thời gian ch ờ đợi. 
- Không ph ải xếp hàng.  
- Không c ần mang theo ti ền mặt. 
 Đối với cộng đồng, xã h ội. 
- Giúp  các ngân hàng, đơn v ị trung gian thanh toán d ễ dàng tri ển khai các d ịch vụ thanh toán vi ện 
phí không dùng ti ền mặt tại bệnh vi ện. 
- Việc kết nối thanh toán đư ợc nhanh chóng, không m ất nhi ều công s ức, giảm chi phí xã h ội và 
không ph ụ thuộc vào đơn v ị cung c ấp dịch vụ thanh toán.  
- Tạo môi trư ờng bình đ ẳng trong vi ệc cung c ấp dịch vụ thanh toán vi ện phí không dùng ti ền mặt. 
1.5. Cục CNTT đề xuất  
- Quy đ ịnh chu ẩn thông tin trong thanh toán y t ế. 
- Quy định chu ẩn kết nối ngân hàng nh ận thanh toán v ới HIS c ủa cơ s ở y tế. 
- Quy định chu ẩn kết nối thẻ NAPAS v ới HIS c ủa cơ s ở y tế. 
- Quy định cấu trúc thông tin QR y t ế trong thanh toán vi ện phí.  
 
 
 
 
 
 
 
 
 
 
 
 
===== PAGE 7 ===== (chars=1301)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   7 
 II. GI ẢI PHÁP  
2.1. Quy trình  
 
LƯU Đ Ồ TRÁCH 
NHI ỆM HỒ SƠ 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 - Phòng QLCL  
- Phòng CTXH  
- ĐV Marketing  - Phiếu thông tin ngư ời bệnh. 
- Thẻ BHYT, CMND, GCT  
- Giấy đồng thu ận thanh toán chênh l ệch 
BHYT  
- Số thứ tự đăng ký khám  
Khoa khám b ệnh - Thẻ BHYT, CMND, GCT  
- Phiếu Khám + Phi ếu chỉ định CLS  
- Số STT khám b ệnh; STT l ấy mẫu (nếu có)  
Tài chính k ế toán Các phi ếu viện phí có tích h ợp mã thanh 
toán QRCode  
- Số STT khám b ệnh 
- Phiếu tạm ứng 
- Phòng QLCL  
- Phòng CTXH  
- ĐV Marketing  - Hướng dẫn các bư ớc thực hiện CLS  
- Hướng dẫn các bư ớc thanh toán  
- Hướng dẫn in phi ếu đã thanh toán 
vào th ực hiện CLS  
 
 
- Tài chính k ế 
toán Các phi ếu viện phí có tích h ợp mã thanh 
toán QRCode  
- Phiếu chỉ định CLS  
- Phiếu tạm ứng 
- Thanh toán mẫu BV/01  
- Tài chính k ế 
toán 
 
- Dược - TCKT in m ẫu thanh toán k ết thúc đi ều trị 
theo danh sách hàng đ ợi đối với bệnh nhân 
đã thanh toán QRCode  
- Dược phát thu ốc theo danh sách b ệnh nhân 
đã đư ợc TCKT k ết thúc in m ẫu BV/01 và 
có hóa đơn.  
Thực 
hiện CLS  
Tiếp đón  
Thu phí  
Khám 
bệnh 
Thực 
hiện CLS  
Lấy toa  
Ký tên 
nhận hddt  
Lãnh thu ốc 
Hướng d ẫn 
thủ tục 
Hoàn ứng 
Kết BV/01  
===== PAGE 8 ===== (chars=725)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   8 
 LƯU Đ Ồ TRÁCH 
NHI ỆM HỒ SƠ 
 
 
 
 
 
 
 
 
 
 
 - Người bệnh ch ỉ việc ngồi chờ phát thu ốc, 
xác nh ận lãnh thu ốc và nh ận HDDT (hoàn 
ứng nếu có).  
 
 
 
Khoa lâm sàng  
 
 
 - Hoàn thi ện các th ủ tục hành chính.  
- Xác nh ập khoa.  
- Phòng QLCL  
- Phòng CTXH  
- ĐV Marketing  - Hướng dẫn các bư ớc thực hiện tạm 
ứng. 
- Hướng dẫn các bư ớc thanh toán.  
- Hướng dẫn in phi ếu đã thanh toán 
thanh toán 02/BV.  
Tài chính k ế toán Phiếu viện phí có tích h ợp mã thanh toán 
QRCode  
- Phiếu tạm ứng 
- Mẫu thanh toán 02/BV  
 
In hóa đơn đi ện tử 
 
 
 
 
 
 
 
 
 Nhập viện 
Nhập khoa 
Chỉ định tạm ứng 
Mẫu 02/BV  Xuất Khoa  Chuy ển khoa  
Xuất viện 
Ký nh ận HDD T 
===== PAGE 9 ===== (chars=182)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   9 
 2.2. Nghiệp vụ  
2.2.1.  Đăng ký khám b ệnh - Đối tượng thu phí  
Bước 1: Nhập thông tin đăng ký khám b ệnh 
 
 
Bước 2: In số thứ tự 
 

===== PAGE 10 ===== (chars=206)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   10 
 Bước 3: Thanh toán : Bệnh nhân  quét QRCode thanh toán (ho ặc thanh toán TM tại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  

===== PAGE 11 ===== (chars=154)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   11 
  
Danh sách ch ờ khám b ệnh 
 
 
 
 
2.2.2.  CLS – Đối tượng thu phí  
Bước 1:  Chỉ định CLS 
 
 
 
 
 
 
 

===== PAGE 12 ===== (chars=84)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   12 
 Bước 2: In phiếu chỉ định CLS  
 
 
 

===== PAGE 13 ===== (chars=206)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   13 
 Bước 3: Thanh toán: Bệnh nhân  quét QRCode  thanh toán (ho ặc thanh toán TM tại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  

===== PAGE 14 ===== (chars=202)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   14 
 Bước 4: Thực hiện CLS  
 
Danh sách chờ thực hiện CLS  – Xquang  
 
Danh sách ch ờ thực hiện CLS  – Siêu âm  
 
Danh sách ch ờ thực hiện CLS – Xét nghi ệm 

===== PAGE 15 ===== (chars=166)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   15 
 2.2.3.  Tạm ứng – Đối tượng thu phí  
Bước 1: Bệnh nhân hiện diện tại khoa  
 
 
Bước 2:  Chỉ định tạm ứng 
 
 
 
 
 
 

===== PAGE 16 ===== (chars=215)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   16 
 Bước 3: In phiếu chỉ định tạm ứng 
 
 
Bước 4: Thanh toán: Bệnh nhân  quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
Hình ảnh quét QRCode chưa thanh toán  

===== PAGE 17 ===== (chars=142)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   17 
  
Hình ảnh đã thanh toán  
 
2.2.4.  BV02  – Đối tượng thu phí  
Bước 1: Xuất viện 
 
 
 
 
 
 

===== PAGE 18 ===== (chars=219)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   18 
 Bước 2: In phi ếu thanh toán ra vi ện 
 
 
Bước 3: Thanh toán: Bệnh nhân  quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
Hình ảnh quét QRCode chưa thanh toán  

===== PAGE 19 ===== (chars=110)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   19 
  
Hình ảnh đã thanh toán  
 
 
Bước 4: Thu ti ền 
 
 
 
 
 
 
 

===== PAGE 20 ===== (chars=165)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   20 
 2.2.5.  Đăng ký khám b ệnh - Đối tượng dịch vụ 
Bước 1: Nhập thông tin đăng ký khám b ệnh 
 
 
Bước 2: In số thứ tự 
 

===== PAGE 21 ===== (chars=209)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   21 
 Bước 3: Thanh toán: Bệnh nhân  quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  
 

===== PAGE 22 ===== (chars=152)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   22 
  
Danh sách ch ờ khám b ệnh 
 
 
2.2.6.  CLS – Đối tượng dịch vụ 
Bước 1:  Chỉ định CLS  
 
 
 
 
 
 
 
 

===== PAGE 23 ===== (chars=85)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   23 
 Bước 2: In phi ếu chỉ định CLS  
 
 
 

===== PAGE 24 ===== (chars=209)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   24 
 Bước 3: Thanh toán: Bệnh nhân  quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  
 

===== PAGE 25 ===== (chars=202)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   25 
 Bước 4: Thực hiện CLS  
 
Danh sách ch ờ thực hiện CLS – Xquang  
 
Danh sách ch ờ thực hiện CLS  – Siêu âm  
 
Danh sách ch ờ thực hiện CLS – Xét nghi ệm 

===== PAGE 26 ===== (chars=168)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   26 
 2.2.7.  Tạm ứng – Đối tượng d ịch vụ 
Bước 1: Bệnh nhân hiện diện tại khoa  
 
 
 
Bước 2:  Chỉ định tạm ứng 
 
 
 
 
 
 

===== PAGE 27 ===== (chars=209)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   27 
 Bước 3: In chỉ định tạm ứng 
 
 
Bước 4: Thanh toán: Bệnh nhân  quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
Hình ảnh quét QRCode chưa thanh toán  

===== PAGE 28 ===== (chars=140)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   28 
  
Hình ảnh đã thanh toán  
 
 
2.2.8.  BV02 – Đối tượng dịch vụ 
Bước 1: Xuất viện 
 
 
 
 
 

===== PAGE 29 ===== (chars=221)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   29 
 Bước 2: In phi ếu thanh toán ra vi ện 
 
 
Bước 3: Thanh toán: Bệnh nhân  quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  

===== PAGE 30 ===== (chars=110)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   30 
  
Hình ảnh đã thanh toán  
 
 
  Bước 4: Thu ti ền 
 
 
 
 
 
 

===== PAGE 31 ===== (chars=170)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   31 
 2.2.9.  Đăng ký khám b ệnh - Đối tượng BHYT phụ thu 
Bước 1: Nhập thông tin đăng ký khám b ệnh 
 
 
Bước 2: In số thứ tự 
 

===== PAGE 32 ===== (chars=207)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   32 
 Bước 3: Thanh toán: Bệnh nhân  quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  

===== PAGE 33 ===== (chars=155)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   33 
  
Danh sách ch ờ khám b ệnh 
 
 
 
 
2.2.10.  CLS – Đối tượng BHYT  
Bước 1:  Chỉ định CLS  
 
 
 
 
 
 
 
 

===== PAGE 34 ===== (chars=85)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   34 
 Bước 2: In phi ếu chỉ định CLS  
 
 
 

===== PAGE 35 ===== (chars=209)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   35 
 Bước 3: Thanh toán: Bệnh nhân  quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  
 

===== PAGE 36 ===== (chars=201)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   36 
 Bước 4: Thực hiện CLS  
 
Danh sách ch ờ thực hiện CLS – Xquang  
 
Danh sách ch ờ thực hiện CLS – Siêu âm  
 
Danh sách ch ờ thực hiện CLS – Xét nghi ệm 

===== PAGE 37 ===== (chars=128)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   37 
 2.2.11.  BV01 – Đối tượng BHYT  
Bước 1: In phi ếu BV01  
 
 
 
 
 
 
 
 
 
 
 
 

===== PAGE 38 ===== (chars=208)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   38 
 Bước 2: Thanh toán: Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  
 

===== PAGE 39 ===== (chars=200)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   39 
 Bước 3: Thu ti ền 
 
 
 
 
 
 
 
 
 
2.2.12.  Đăng ký khám b ệnh - Đối tượng thu phí (phòng tiêm ng ừa) 
Bước 1: Nhập thông tin đăng ký khám b ệnh 
 
 
 

===== PAGE 40 ===== (chars=178)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   40 
 Bước 2: In số thứ tự 
 
 
2.2.13.  CLS – Đối tượng thu phí (phòng tiêm ng ừa) 
Bước 1:  Cho thu ốc toa F10 (hao phí và d ịch vụ) 
 

===== PAGE 41 ===== (chars=109)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   41 
  Bước 2: Chỉ định CLS  
 
 
Bước 3: In phi ếu chỉ định CLS  
 

===== PAGE 42 ===== (chars=206)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   42 
 Bước 4: Thanh toán: Bệnh nhân quét QRCod e thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  

===== PAGE 43 ===== (chars=355)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   43 
 Bước 5: Thực hiện CLS  
Bước 6: Để Bác S ỹ: Nhận biết BN đã đóng ti ền bằng hình th ức quét thanh toán thì ta làm 
như sau: Ti ện ích  Duyệt dịch vụ cận lâm sàng.  
 
 
 Bước 7: Thu ti ền 
 
 
 
2.2.14.  Đăng ký khám b ệnh - Đối tượng BHYT (phòng khám ngo ại) 
Bước 1: Nhập thông tin đăng ký khám b ệnh 
 
 

===== PAGE 44 ===== (chars=169)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   44 
 Bước 2: In số thứ tự 
 
 
 
2.2.15.  CLS – Đối tượng BHYT  (phòng khám ngo ại) 
Bước 1: Cho thu ốc toa F10 (nhà thu ốc) 
 

===== PAGE 45 ===== (chars=108)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   45 
 Bước 2: Chỉ định CLS  
 
 
Bước 3: In phi ếu chỉ định CLS  
 

===== PAGE 46 ===== (chars=207)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   46 
 Bước 4: Thanh toán: Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét  QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  

===== PAGE 47 ===== (chars=166)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   47 
 Bước 5: Thực hiện CLS  
2.2.16.  BV01 – Đối tượng BHYT  
Bước 1: In phi ếu BV01  
 
 
 
 Bước 2: Thu ti ền 
 
 
 
 
 
 

===== PAGE 48 ===== (chars=169)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   48 
 2.2.17.  Hoàn tr ả công khám  – Đối tượng thu phí  
Bước 1: Nhập thông tin đăng ký khám b ệnh 
 
 
Bước 2: In số thứ tự 
 

===== PAGE 49 ===== (chars=206)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   49 
 Bước 3: Thanh toán: Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  

===== PAGE 50 ===== (chars=108)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   50 
  
Danh sách ch ờ khám b ệnh 
 Bước 4: Hoàn tr ả hóa đơn  
 
 

===== PAGE 51 ===== (chars=167)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   51 
 2.2.18.  Chỉ định CLS ở form đăng ký khám b ệnh 
Bước 1: Nhập thông tin đăng ký khám b ệnh 
 
 
Bước 2: In số thứ tự  
 

===== PAGE 52 ===== (chars=105)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   52 
 Bước 3: Chỉ định CLS  
 
Bước 4: In phiếu chỉ định CLS  
 

===== PAGE 53 ===== (chars=206)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   53 
 Bước 5: Thanh toán: Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét Qrcode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  

===== PAGE 54 ===== (chars=209)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   54 
 Bước 6: Thực hiện CLS 
 Bước 7: Thu ti ền 
 
 
 
2.2.19.  Khám 2 chuyên khoa – Đối tượng BHYT ph ụ thu 
Bước 1: Nhập thông tin đăng ký khám b ệnh 
 
 
 
 
 
 
 
 

===== PAGE 55 ===== (chars=204)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   55 
 Bước 2: In số thứ tự 
 
 
Bước 3: Thanh toán: Bệnh nhân  quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét Qrcode chưa thanh toán  

===== PAGE 56 ===== (chars=114)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   56 
  
Hình ảnh đã thanh toán  
 
 
 
Danh sách ch ờ khám b ệnh 
 
 
 
 

===== PAGE 57 ===== (chars=140)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   57 
 2.2.20.  CLS – Đối tượng BHYT  
Bước 1: Chỉ định CLS  
 
 
 Bước 2: In phiếu chỉ định CLS  
 

===== PAGE 58 ===== (chars=206)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   58 
 Bước 3: Thanh toán: Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét Qrcode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  

===== PAGE 59 ===== (chars=280)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   59 
 Bước 4: Thực hiện CLS  
Bước 5: Xử trí chuyển phòng khám  
 Bước 6: In phi ếu chuy ển phòng khám  
 
 
Bước 7: Thanh toán: Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét Qrcode chưa thanh toán  

===== PAGE 60 ===== (chars=114)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   60 
  
Hình ảnh đã thanh toán  
 
 
Danh sách ch ờ khám b ệnh 
 
 
 
 
 

===== PAGE 61 ===== (chars=106)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   61 
 Bước 8: Chỉ định CLS  
 
 Bước 9: In phiếu chỉ định CLS  
 

===== PAGE 62 ===== (chars=208)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   62 
 Bước 10:  Thanh toán: Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét Qrcode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  

===== PAGE 63 ===== (chars=165)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   63 
 Bước 11:  Thực hiện CLS  
 Bước 12:  Cấp toa F3  
2.2.21.  In Bv01 – Đối tượng BHYT  
 Bước 1: In Bv01  
 
 
 
 
 
 
 

===== PAGE 64 ===== (chars=206)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   64 
 Bước 2: Thanh toán: Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét Qrcode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  

===== PAGE 65 ===== (chars=182)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   65 
  Bước 3: Thu ti ền 
 
 
 
 
2.2.22.  Cho l ại chỉ định CLS – Đối tượng thu phí  
Bước 1: Nhập thông tin đăng ký khám b ệnh 
 
 
 
 
 
 

===== PAGE 66 ===== (chars=202)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   66 
 Bước 2: In số thứ tự 
 
Bước 3: Thanh toán:  Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét Qrcode chưa thanh toán  

===== PAGE 67 ===== (chars=114)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   67 
  
Hình ảnh đã thanh toán  
 
 
 
Danh sách ch ờ khám b ệnh 
 
 
 
 

===== PAGE 68 ===== (chars=107)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   68 
 Bước 4: Chỉ định CLS  
 
 
Bước 5: In phiếu chỉ định CLS  
 

===== PAGE 69 ===== (chars=206)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   69 
 Bước 6: Thanh toán: Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét Qrcode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  

===== PAGE 70 ===== (chars=108)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   70 
 Bước 7: Xóa ch ỉ định CLS  
 
Bước 8: Hoàn tr ả hóa đơn  
 
 

===== PAGE 71 ===== (chars=115)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   71 
  Bước 9: Xóa chỉ định CLS  
 
 
 Bước 10: In phi ếu chỉ định CLS  
 

===== PAGE 72 ===== (chars=207)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   72 
 Bước 11: Thanh toán: Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét Qrcode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  

===== PAGE 73 ===== (chars=194)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   73 
  Bước 12: Thu ti ền 
 
 
 
2.2.23.  Đăng ký khám b ệnh - Đối tượng BHYT  (Phòng lưu)  
Bước 1: Nhập thông tin đăng ký khám b ệnh 
 
 
 
 
 
 
 
 
 

===== PAGE 74 ===== (chars=111)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   74 
 Bước 2: Chỉ định tạm ứng 
 
 
Bước 3 : In ch ỉ định tạm ứng 
 
 

===== PAGE 75 ===== (chars=209)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   75 
 Bước 4: Thanh toán: Bệnh nhân  quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  
 

===== PAGE 76 ===== (chars=243)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   76 
 2.2.24.  CLS – Đối tượng BHYT  
Bước 1:  Chỉ định CLS  
 
 
Bước 2: Thực hiện CLS  
Bước 3: Xuất thuốc tủ trực của dược 
 
2.2.25.  BV01 – Đối tượng BHYT  
Bước 1: In phi ếu BV01  
 
 
 
 
 
 
 
 

===== PAGE 77 ===== (chars=208)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   77 
 Bước 2: Thanh toán: Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  
 

===== PAGE 78 ===== (chars=197)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   78 
 Bước 3: Thu ti ền 
 
 
 
2.2.26.  Đăng ký khám b ệnh - Đối tượng Thu phí  (Phòng lưu)  
Bước 1: Nhập thông tin đăng ký khám b ệnh 
 
 
 
 
 
 
 
 
 
 

===== PAGE 79 ===== (chars=111)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   79 
 Bước 2: Chỉ định tạm ứng 
 
 
Bước 3 : In ch ỉ định tạm ứng 
 
 

===== PAGE 80 ===== (chars=208)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   80 
 Bước 4: Thanh toán: Bệnh nhân quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  
 

===== PAGE 81 ===== (chars=241)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   81 
 2.2.27.  CLS – Đối tượng Thu phí  
Bước 1:  Chỉ định CLS  
 
 
Bước 2: Thực hiện CLS  
Bước 3: Xuất thuốc tủ trực của dược 
 
2.2.28.  BV01 – Đối tượng Thu phí  
Bước 1: In phi ếu BV01  
 
 
 
 

===== PAGE 82 ===== (chars=209)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   82 
 Bước 2: Thanh toán: Bệnh nhân  quét QRCode  thanh toán (ho ặc thanh toán TM t ại quầy). 
 
 
Hình ảnh quét QRCode chưa thanh toán  
 
 
Hình ảnh đã thanh toán  
 

===== PAGE 83 ===== (chars=275)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   83 
 Bước 3: Thu ti ền 
 
 
 
2.3. Báo cáo  
2.3.1.  Báo cáo tạm ứng VNPay  
Bước 1: Vào menu: A.Vi ện phí  1.Các lo ại Bảng kê 1.2 Báo cáo hóa đơn thu t ạm ứng. 
 
Bước 2: Check t ùy ch ọn vào VNPAY  chọn Mẫu báo cáo chung  
 
 
 

===== PAGE 84 ===== (chars=154)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   84 
 Bước 3: In báo cáo  (không in chung hóa đơn hoàn)  
 
Bước 4: In báo cáo  (In chung hóa đơn hoàn)  
 
 
 
 

===== PAGE 85 ===== (chars=216)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   85 
 2.3.2.  Báo cáo thu ti ền theo ngày – tổng hợp 
Bước 1:Vào menu: A.Vi ện phí 1.Các lo ại Bảng kê1.16 Báo cáo thu ti ền theo ngày - tổng hợp 
 
 
Bước 2: In báo cáo  
 

===== PAGE 86 ===== (chars=247)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   86 
 2.3.3.  Báo cáo thu ti ền theo ngày – chi ti ết 
Bước 1: Vào menu: A.Vi ện phí  1.Các lo ại Bảng kê 1.16 Báo cáo thu ti ền theo ngày  – chi ti ết 
 
 
Bước 2: In báo cáo  (nguồn sự nghi ệp) 
 
 
 
 

===== PAGE 87 ===== (chars=109)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   87 
  
 
Bước 3: In báo cáo  (nguồn dịch vụ) 
 
 
 
 
 
 
 
 
 
 
 

===== PAGE 88 ===== (chars=159)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   88 
 2.3.4.  Báo cáo HDDT  – Sự nghi ệp 
 
2.3.5.  Báo cáo HDDT – Dịch vụ 
 
2.3.6.  Báo cáo vi ện phí chi ti ết 
 
 

===== PAGE 89 ===== (chars=291)
GIẢI PHÁP  THANH TOÁN KHÔNG TI ỀN M ẶT   89 
 2.3.7.  Báo cáo nhà thu ốc 
 
2.3.8.  Báo cáo hoàn tr ả biên lai  VNPAY  
Bước 1: Vào menu: A.Vi ện phí  1.Các lo ại Bảng kê 1.4 B ảng kê hoàn tr ả biên lai  
 
Bước 2: Check Dữ liệu VNPAY chọn Dữ liệu báo cáo: Tạm ứng 
Bước 3: In báo cáo  
 

```
