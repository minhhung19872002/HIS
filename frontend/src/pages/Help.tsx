import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Typography,
  Menu,
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
    } catch {
      setCategories([]);
      message.warning('Không thể tải danh mục trợ giúp. Vui lòng thử lại sau.');
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
    } catch {
      setArticles([]);
      message.warning('Không thể tải bài viết trợ giúp. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch troubleshooting
  const fetchTroubleshooting = async () => {
    try {
      const response = await risApi.getTroubleshootingList();
      setTroubleshooting(response.data || []);
    } catch {
      setTroubleshooting([]);
      message.warning('Không thể tải danh sách hướng dẫn khắc phục sự cố. Vui lòng thử lại sau.');
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
            <Space orientation="vertical" align="center" style={{ width: '100%', textAlign: 'center' }}>
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
    <Spin spinning={loading}>
      <div>
        {articles.filter(a => !selectedCategory || a.categoryId === selectedCategory).map((article) => (
          <div
            key={article.id}
            onClick={() => handleArticleSelect(article)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <div><Text strong>{article.title}</Text></div>
                <Space orientation="vertical" size={0}>
                  <Text type="secondary">{article.summary}</Text>
                  <Tag>{article.categoryName}</Tag>
                </Space>
              </div>
            </div>
            <Space>
              {article.videoUrl && <Tag color="red" icon={<VideoCameraOutlined />}>Video</Tag>}
              <Text type="secondary">{article.viewCount} lượt xem</Text>
            </Space>
          </div>
        ))}
      </div>
    </Spin>
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
              title="Hướng dẫn video"
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
      <Collapse
        accordion
        items={troubleshooting.map((item) => ({
          key: item.id,
          label: (
            <Space>
              <Tag color="red">{item.code}</Tag>
              <Tag>{item.category}</Tag>
              <Text strong>{item.problem}</Text>
            </Space>
          ),
          children: (
            <Space orientation="vertical" style={{ width: '100%' }}>
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
          ),
        }))}
      />
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
            <Space orientation="vertical" style={{ width: '100%' }}>
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
