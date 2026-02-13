import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Typography,
  Menu,
  List,
  Tag,
  Space,
  Button,
  Collapse,
  Breadcrumb,
  Empty,
  Spin,
  Divider,
  Badge,
  message,
  Alert,
} from 'antd';
import {
  SearchOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  BulbOutlined,
  ToolOutlined,
  LinkOutlined,
  HomeOutlined,
  RightOutlined,
  VideoCameraOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import risApi from '../api/ris';
import type {
  HelpCategoryDto,
  HelpArticleDto,
  TroubleshootingDto,
} from '../api/ris';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Panel } = Collapse;

// Category icons mapping
const categoryIcons: Record<string, React.ReactNode> = {
  'getting-started': <PlayCircleOutlined />,
  'user-guide': <BookOutlined />,
  'templates': <FileTextOutlined />,
  'integration': <LinkOutlined />,
  'troubleshooting': <ToolOutlined />,
  'permissions': <SettingOutlined />,
  'faq': <QuestionCircleOutlined />,
};

const Help: React.FC = () => {
  const [categories, setCategories] = useState<HelpCategoryDto[]>([]);
  const [articles, setArticles] = useState<HelpArticleDto[]>([]);
  const [troubleshooting, setTroubleshooting] = useState<TroubleshootingDto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticleDto | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'categories' | 'article' | 'troubleshooting'>('categories');

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await risApi.getHelpCategories();
      setCategories(response.data || []);
    } catch (error) {
      // Use mock data
      setCategories([
        { id: '1', code: 'getting-started', name: 'Bắt đầu sử dụng', description: 'Hướng dẫn cơ bản cho người mới', sortOrder: 1, isActive: true },
        { id: '2', code: 'user-guide', name: 'Hướng dẫn sử dụng', description: 'Hướng dẫn chi tiết các tính năng', sortOrder: 2, isActive: true },
        { id: '3', code: 'templates', name: 'Thiết kế mẫu kết quả', description: 'Hướng dẫn thiết kế mẫu báo cáo', sortOrder: 3, isActive: true },
        { id: '4', code: 'integration', name: 'Tích hợp hệ thống', description: 'Hướng dẫn tích hợp với HIS/PACS', sortOrder: 4, isActive: true },
        { id: '5', code: 'troubleshooting', name: 'Khắc phục sự cố', description: 'Các lỗi thường gặp và cách xử lý', sortOrder: 5, isActive: true },
        { id: '6', code: 'permissions', name: 'Phân quyền', description: 'Hướng dẫn phân quyền người dùng', sortOrder: 6, isActive: true },
      ]);
    }
  };

  // Fetch articles
  const fetchArticles = async (categoryId?: string, keyword?: string) => {
    setLoading(true);
    try {
      const response = await risApi.searchHelpArticles({
        categoryId,
        keyword,
        page: 1,
        pageSize: 50,
      });
      setArticles(response.data?.items || []);
    } catch (error) {
      // Use mock data
      setArticles([
        {
          id: '1',
          title: 'Cách đăng nhập vào hệ thống RIS',
          summary: 'Hướng dẫn chi tiết các bước đăng nhập vào hệ thống RIS/PACS',
          categoryId: '1',
          categoryName: 'Bắt đầu sử dụng',
          viewCount: 1250,
          sortOrder: 1,
          isActive: true,
          content: `
## Đăng nhập hệ thống

### Bước 1: Truy cập trang đăng nhập
Mở trình duyệt và truy cập địa chỉ: http://localhost:3000

### Bước 2: Nhập thông tin đăng nhập
- **Tên đăng nhập**: Nhập tên tài khoản được cấp
- **Mật khẩu**: Nhập mật khẩu

### Bước 3: Nhấn nút "Đăng nhập"
Sau khi nhập đầy đủ thông tin, nhấn nút Đăng nhập để vào hệ thống.

> **Lưu ý**: Nếu quên mật khẩu, vui lòng liên hệ quản trị viên.
          `,
        },
        {
          id: '2',
          title: 'Thiết kế mẫu kết quả CĐHA',
          summary: 'Hướng dẫn tạo và chỉnh sửa mẫu kết quả chẩn đoán hình ảnh',
          categoryId: '3',
          categoryName: 'Thiết kế mẫu kết quả',
          viewCount: 890,
          sortOrder: 1,
          isActive: true,
          videoUrl: 'https://example.com/video/template-design',
        },
        {
          id: '3',
          title: 'Cấu hình kết nối PACS Server',
          summary: 'Hướng dẫn thiết lập kết nối với máy chủ PACS',
          categoryId: '4',
          categoryName: 'Tích hợp hệ thống',
          viewCount: 567,
          sortOrder: 1,
          isActive: true,
        },
        {
          id: '4',
          title: 'Phân quyền theo màn hình',
          summary: 'Hướng dẫn thiết lập quyền truy cập cho từng màn hình',
          categoryId: '6',
          categoryName: 'Phân quyền',
          viewCount: 432,
          sortOrder: 1,
          isActive: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch troubleshooting
  const fetchTroubleshooting = async () => {
    try {
      const response = await risApi.getTroubleshootingList();
      setTroubleshooting(response.data || []);
    } catch (error) {
      // Use mock data
      setTroubleshooting([
        {
          id: '1',
          code: 'ERR001',
          category: 'Kết nối',
          problem: 'Không thể kết nối đến PACS Server',
          solution: 'Kiểm tra cấu hình IP và Port của PACS Server',
          steps: '1. Vào Cài đặt > Kết nối PACS\n2. Kiểm tra IP Address và Port\n3. Nhấn "Kiểm tra kết nối"\n4. Nếu vẫn lỗi, kiểm tra firewall',
          sortOrder: 1,
          isActive: true,
        },
        {
          id: '2',
          code: 'ERR002',
          category: 'Ký số',
          problem: 'Token ký số không được nhận diện',
          solution: 'Cài đặt driver cho USB Token và khởi động lại trình duyệt',
          steps: '1. Kiểm tra USB Token đã cắm chưa\n2. Cài đặt driver từ nhà cung cấp\n3. Khởi động lại trình duyệt\n4. Thử lại chức năng ký số',
          sortOrder: 2,
          isActive: true,
        },
        {
          id: '3',
          code: 'ERR003',
          category: 'In ấn',
          problem: 'Không in được nhãn dán ca chụp',
          solution: 'Kiểm tra cấu hình máy in và mẫu nhãn',
          steps: '1. Kiểm tra máy in có kết nối không\n2. Vào Cài đặt > Cấu hình nhãn in\n3. Chọn đúng máy in và kích thước nhãn\n4. In thử',
          sortOrder: 3,
          isActive: true,
        },
        {
          id: '4',
          code: 'ERR004',
          category: 'Tích hợp HIS',
          problem: 'Phiếu chỉ định không tự động cập nhật từ HIS',
          solution: 'Kiểm tra cấu hình webservice và log tích hợp',
          steps: '1. Vào Quản lý > Log tích hợp\n2. Kiểm tra có message lỗi không\n3. Kiểm tra cấu hình HIS tại Cài đặt > Kết nối HIS\n4. Retry message lỗi nếu có',
          sortOrder: 4,
          isActive: true,
        },
      ]);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchArticles();
    fetchTroubleshooting();
  }, []);

  // Handle category select
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedArticle(null);
    fetchArticles(categoryId);
    setActiveView('categories');
  };

  // Handle article select
  const handleArticleSelect = async (article: HelpArticleDto) => {
    setLoading(true);
    try {
      const response = await risApi.getHelpArticle(article.id);
      setSelectedArticle(response.data || article);
    } catch {
      setSelectedArticle(article);
    } finally {
      setLoading(false);
      setActiveView('article');
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    fetchArticles(undefined, value);
  };

  // Render category grid
  const renderCategoryGrid = () => (
    <Row gutter={[16, 16]}>
      {categories.map((category) => (
        <Col xs={24} sm={12} md={8} lg={6} key={category.id}>
          <Card
            hoverable
            onClick={() => handleCategorySelect(category.id)}
            style={{ height: '100%' }}
          >
            <Space direction="vertical" align="center" style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: 32, color: '#1890ff' }}>
                {categoryIcons[category.code] || <BookOutlined />}
              </div>
              <Text strong>{category.name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {category.description}
              </Text>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );

  // Render article list
  const renderArticleList = () => (
    <List
      loading={loading}
      dataSource={articles.filter(a => !selectedCategory || a.categoryId === selectedCategory)}
      renderItem={(article) => (
        <List.Item
          onClick={() => handleArticleSelect(article)}
          style={{ cursor: 'pointer' }}
          actions={[
            article.videoUrl && <Tag color="red" icon={<VideoCameraOutlined />}>Video</Tag>,
            <Text type="secondary">{article.viewCount} lượt xem</Text>,
          ]}
        >
          <List.Item.Meta
            avatar={<FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
            title={article.title}
            description={
              <Space direction="vertical" size={0}>
                <Text type="secondary">{article.summary}</Text>
                <Tag>{article.categoryName}</Tag>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );

  // Render article content
  const renderArticleContent = () => {
    if (!selectedArticle) return null;

    return (
      <div>
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item>
            <a onClick={() => { setSelectedArticle(null); setActiveView('categories'); }}>
              <HomeOutlined /> Trang chủ
            </a>
          </Breadcrumb.Item>
          {selectedArticle.categoryName && (
            <Breadcrumb.Item>{selectedArticle.categoryName}</Breadcrumb.Item>
          )}
          <Breadcrumb.Item>{selectedArticle.title}</Breadcrumb.Item>
        </Breadcrumb>

        <Card>
          <Title level={3}>{selectedArticle.title}</Title>
          <Space style={{ marginBottom: 16 }}>
            <Tag>{selectedArticle.categoryName}</Tag>
            <Text type="secondary">{selectedArticle.viewCount} lượt xem</Text>
          </Space>

          {selectedArticle.videoUrl && (
            <Alert
              message="Hướng dẫn video"
              description={
                <Button type="link" icon={<PlayCircleOutlined />} href={selectedArticle.videoUrl} target="_blank">
                  Xem video hướng dẫn
                </Button>
              }
              type="info"
              showIcon
              icon={<VideoCameraOutlined />}
              style={{ marginBottom: 16 }}
            />
          )}

          <Divider />

          <div style={{ whiteSpace: 'pre-wrap' }}>
            {selectedArticle.content || selectedArticle.summary}
          </div>
        </Card>
      </div>
    );
  };

  // Render troubleshooting
  const renderTroubleshooting = () => (
    <Card title={<><ToolOutlined /> Khắc phục sự cố thường gặp</>}>
      <Collapse accordion>
        {troubleshooting.map((item) => (
          <Panel
            key={item.id}
            header={
              <Space>
                <Tag color="red">{item.code}</Tag>
                <Tag>{item.category}</Tag>
                <Text strong>{item.problem}</Text>
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Giải pháp:</Text>
                <Paragraph>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  {item.solution}
                </Paragraph>
              </div>
              {item.steps && (
                <div>
                  <Text type="secondary">Các bước thực hiện:</Text>
                  <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, marginTop: 8 }}>
                    {item.steps}
                  </pre>
                </div>
              )}
            </Space>
          </Panel>
        ))}
      </Collapse>
    </Card>
  );

  return (
    <div>
      <Title level={4}>
        <QuestionCircleOutlined /> Hướng dẫn sử dụng
      </Title>

      <Row gutter={[16, 16]}>
        {/* Sidebar */}
        <Col xs={24} md={6}>
          <Card size="small">
            <Search
              placeholder="Tìm kiếm..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              style={{ marginBottom: 16 }}
            />

            <Menu
              mode="vertical"
              selectedKeys={selectedCategory ? [selectedCategory] : []}
              onClick={({ key }) => {
                if (key === 'all') {
                  setSelectedCategory(null);
                  fetchArticles();
                } else if (key === 'troubleshooting') {
                  setActiveView('troubleshooting');
                } else {
                  handleCategorySelect(key);
                }
              }}
              items={[
                {
                  key: 'all',
                  icon: <HomeOutlined />,
                  label: 'Tất cả',
                },
                ...categories.map((cat) => ({
                  key: cat.id,
                  icon: categoryIcons[cat.code] || <BookOutlined />,
                  label: cat.name,
                })),
                { type: 'divider' as const },
                {
                  key: 'troubleshooting',
                  icon: <ToolOutlined />,
                  label: (
                    <Space>
                      Khắc phục sự cố
                      <Badge count={troubleshooting.length} style={{ backgroundColor: '#f5222d' }} />
                    </Space>
                  ),
                },
              ]}
            />
          </Card>

          {/* Quick Links */}
          <Card size="small" title="Liên kết nhanh" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="link" icon={<DownloadOutlined />} block style={{ textAlign: 'left' }}>
                Tài liệu hướng dẫn (PDF)
              </Button>
              <Button type="link" icon={<VideoCameraOutlined />} block style={{ textAlign: 'left' }}>
                Video hướng dẫn
              </Button>
              <Button type="link" icon={<QuestionCircleOutlined />} block style={{ textAlign: 'left' }}>
                Câu hỏi thường gặp
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Main Content */}
        <Col xs={24} md={18}>
          <Spin spinning={loading}>
            {activeView === 'categories' && !selectedArticle && (
              <>
                {!selectedCategory && (
                  <>
                    <Title level={5}>Chọn danh mục</Title>
                    {renderCategoryGrid()}
                    <Divider />
                  </>
                )}

                {selectedCategory && (
                  <Breadcrumb style={{ marginBottom: 16 }}>
                    <Breadcrumb.Item>
                      <a onClick={() => { setSelectedCategory(null); fetchArticles(); }}>
                        <HomeOutlined /> Trang chủ
                      </a>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>
                      {categories.find(c => c.id === selectedCategory)?.name}
                    </Breadcrumb.Item>
                  </Breadcrumb>
                )}

                <Card title="Bài viết hướng dẫn">
                  {articles.length > 0 ? renderArticleList() : <Empty description="Không có bài viết" />}
                </Card>
              </>
            )}

            {activeView === 'article' && renderArticleContent()}

            {activeView === 'troubleshooting' && renderTroubleshooting()}
          </Spin>
        </Col>
      </Row>
    </div>
  );
};

export default Help;
