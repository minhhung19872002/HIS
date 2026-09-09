package vn.com.bluestar.his.patient_app

import android.os.Bundle
import android.view.WindowManager
import io.flutter.embedding.android.FlutterFragmentActivity

/**
 * Activity gốc của app.
 *
 * **Phải là `FlutterFragmentActivity`, không phải `FlutterActivity`.** Hộp thoại vân tay / khuôn mặt
 * của Android (`BiometricPrompt`) là một `DialogFragment`, nên nó cần một `FragmentActivity` để gắn
 * vào. Kế thừa `FlutterActivity` thì plugin sinh trắc ném `INCOMPATIBLE_ACTIVITY` ngay ở bước dò khả
 * năng của máy — và vì app xử lý lỗi đó bằng cách **ẩn nút đăng nhập sinh trắc đi**, mọi thứ trông
 * vẫn bình thường: không có màn hình lỗi, không có báo cáo sự cố, chỉ là tính năng sinh trắc của
 * HSMT I.2 #9 không bao giờ xuất hiện trên bất kỳ máy Android nào. Lỗi này lộ ra nhờ dòng log
 * `INCOMPATIBLE_ACTIVITY` trong lần chạy bộ chụp bằng chứng trên máy ảo Android 7.1.1.
 *
 * `FLAG_SECURE` chặn chụp màn hình và quay màn hình cho toàn app (HSMT I.2 #9). Đặt ở tầng cửa sổ
 * nên nó phủ mọi màn hình, kể cả những màn viết sau này: không ai phải nhớ bật cờ ở từng trang. Hệ
 * điều hành cũng che luôn nội dung app trong danh sách ứng dụng gần đây — chỗ ảnh kết quả xét
 * nghiệm rất dễ lọt ra ngoài mà không ai để ý.
 *
 * Cố ý KHÔNG dùng plugin cho `FLAG_SECURE`: đây là hai dòng của Android, còn thêm một gói phụ thuộc
 * nữa là thêm một thứ có thể phá trần iOS 12 ở lần nâng cấp sau (xem README §6.2).
 */
class MainActivity : FlutterFragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
    }
}
