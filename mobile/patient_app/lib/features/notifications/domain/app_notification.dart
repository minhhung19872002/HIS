
import '../../../core/json.dart';
/// Một thông báo trong hộp thư của app.
class AppNotificationItem {
  const AppNotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.category,
    required this.isRead,
    required this.createdAt,
    this.deepLink,
  });

  final String id;
  final String title;
  final String body;

  /// system | result | appointment | queue | hospital
  final String category;

  final String? deepLink;
  final bool isRead;
  final DateTime createdAt;

  factory AppNotificationItem.fromJson(Map<String, dynamic> json) => AppNotificationItem(
        id: json['id'] as String? ?? '',
        title: json['title'] as String? ?? '',
        body: json['body'] as String? ?? '',
        category: json['category'] as String? ?? 'system',
        deepLink: json['deepLink'] as String?,
        isRead: asBool(json['isRead']),
        createdAt:
            DateTime.tryParse(json['createdAt'] as String? ?? '')?.toLocal() ?? DateTime.now(),
      );
}
