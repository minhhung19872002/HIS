package vn.com.bluestar.his.patient_app

import android.os.Bundle
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity

/**
 * Chặn chụp màn hình và quay màn hình cho toàn app (HSMT I.2 #9 — bảo mật).
 *
 * `FLAG_SECURE` đặt ở tầng cửa sổ nên nó phủ mọi màn hình, kể cả những màn viết sau này: không ai
 * phải nhớ bật cờ ở từng trang. Hệ điều hành cũng che luôn nội dung app trong danh sách ứng dụng
 * gần đây — chỗ ảnh kết quả xét nghiệm rất dễ lọt ra ngoài mà không ai để ý.
 *
 * Cố ý KHÔNG dùng plugin: đây là hai dòng của Android, còn thêm một gói phụ thuộc nữa là thêm một
 * thứ có thể phá trần iOS 12 ở lần nâng cấp sau (xem README §6.2).
 */
class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
    }
}
