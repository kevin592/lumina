import { useState } from 'react';

// 柔和主色调选项
const colorOptions = [
  {
    name: '紫罗兰',
    primary: '#9B59B6',
    primaryHover: '#8E44AD',
    primaryLight: 'rgba(155, 89, 182, 0.1)',
    description: '优雅神秘，现代科技感'
  },
  {
    name: '樱花粉',
    primary: '#FF6B9D',
    primaryHover: '#FF558A',
    primaryLight: 'rgba(255, 107, 157, 0.1)',
    description: '浪漫温馨，柔和友好'
  },
  {
    name: '薄荷绿',
    primary: '#20B2AA',
    primaryHover: '#1A9B94',
    primaryLight: 'rgba(32, 178, 170, 0.1)',
    description: '清新自然，舒适治愈'
  },
  {
    name: '珊瑚橙',
    primary: '#FF9F7C',
    primaryHover: '#FF8B62',
    primaryLight: 'rgba(255, 159, 124, 0.1)',
    description: '温暖活力，橙色柔和'
  },
  {
    name: '薰衣草',
    primary: '#A78BFA',
    primaryHover: '#8B5CF6',
    primaryLight: 'rgba(167, 139, 250, 0.1)',
    description: '浪漫梦幻，紫色调柔和'
  },
  {
    name: '天空蓝',
    primary: '#64B5F6',
    primaryHover: '#42A5F5',
    primaryLight: 'rgba(100, 181, 246, 0.1)',
    description: '清新明亮，柔和蓝调'
  },
  {
    name: '玫瑰金',
    primary: '#E8A3A3',
    primaryHover: '#DD8585',
    primaryLight: 'rgba(232, 163, 163, 0.1)',
    description: '优雅精致，温暖色调'
  },
  {
    name: '青柠',
    primary: '#B8E986',
    primaryHover: '#9DD66F',
    primaryLight: 'rgba(184, 233, 134, 0.1)',
    description: '清新活力，绿色柔和'
  }
];

export default function ColorPreviewPage() {
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F5F7',
      padding: '40px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '34px',
          fontWeight: 700,
          marginBottom: '12px',
          color: '#000000'
        }}>
          选择主色调
        </h1>
        <p style={{
          fontSize: '17px',
          color: '#6E6E73',
          marginBottom: '40px'
        }}>
          点击不同的颜色预览效果，选择你最喜欢的主色调
        </p>

        {/* 颜色选项网格 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '48px'
        }}>
          {colorOptions.map((color) => (
            <div
              key={color.name}
              onClick={() => setSelectedColor(color)}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '20px',
                border: `2px solid ${selectedColor.name === color.name ? color.primary : '#E5E5EA'}`,
                cursor: 'pointer',
                transition: 'all 200ms cubic-bezier(0, 0, 0.2, 1)',
                boxShadow: selectedColor.name === color.name
                  ? `0 8px 24px ${color.primary}33`
                  : '0 2px 8px rgba(0, 0, 0, 0.06)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${color.primary}33`;
              }}
              onMouseLeave={(e) => {
                if (selectedColor.name !== color.name) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                }
              }}
            >
              {/* 色块展示 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: color.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '24px',
                  fontWeight: 600
                }}>
                  {color.name[0]}
                </div>
                <div>
                  <h3 style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: '#000000',
                    marginBottom: '2px'
                  }}>
                    {color.name}
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: color.primary,
                    fontFamily: 'monospace'
                  }}>
                    {color.primary}
                  </p>
                </div>
              </div>
              <p style={{
                fontSize: '14px',
                color: '#6E6E73',
                lineHeight: '1.5'
              }}>
                {color.description}
              </p>
            </div>
          ))}
        </div>

        {/* 实时预览区域 */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(0, 0, 0, 0.08)'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 700,
            marginBottom: '24px',
            color: '#000000'
          }}>
            实时预览 - {selectedColor.name}
          </h2>

          {/* 预览组件 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* 按钮组 */}
            <div>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#000000'
              }}>
                按钮
              </h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button style={{
                  background: selectedColor.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms cubic-bezier(0, 0, 0.2, 1)'
                }}>
                  主要按钮
                </button>
                <button style={{
                  background: '#F5F5F7',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms cubic-bezier(0, 0, 0.2, 1)'
                }}>
                  次要按钮
                </button>
                <button style={{
                  background: 'transparent',
                  color: selectedColor.primary,
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms cubic-bezier(0, 0, 0.2, 1)'
                }}>
                  文字按钮
                </button>
              </div>
            </div>

            {/* 输入框 */}
            <div>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#000000'
              }}>
                输入框
              </h3>
              <input
                type="text"
                placeholder="输入一些文字..."
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  background: '#F5F5F7',
                  border: `1px solid rgba(0, 0, 0, 0.08)`,
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 150ms cubic-bezier(0, 0, 0.2, 1)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = selectedColor.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${selectedColor.primaryLight}`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* 标签/徽章 */}
            <div>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#000000'
              }}>
                标签和徽章
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  background: selectedColor.primaryLight,
                  color: selectedColor.primary,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  优先级 1
                </span>
                <span style={{
                  background: selectedColor.primary,
                  color: '#FFFFFF',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  已完成
                </span>
                <span style={{
                  background: '#F5F5F7',
                  color: '#6E6E73',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  待处理
                </span>
              </div>
            </div>

            {/* 卡片示例 */}
            <div>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#000000'
              }}>
                卡片
              </h3>
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                maxWidth: '400px',
                transition: 'all 200ms cubic-bezier(0, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: selectedColor.primaryLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: selectedColor.primary,
                    fontSize: '20px'
                  }}>
                    ✓
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#000000',
                      marginBottom: '2px'
                    }}>
                      完成项目设计
                    </h4>
                    <p style={{
                      fontSize: '13px',
                      color: '#6E6E73'
                    }}>
                      今天 14:00
                    </p>
                  </div>
                </div>
                <p style={{
                  fontSize: '14px',
                  color: '#000000',
                  lineHeight: '1.5',
                  marginBottom: '12px'
                }}>
                  这是一个示例任务卡片，展示了主色调在实际组件中的应用效果。
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    background: selectedColor.primaryLight,
                    color: selectedColor.primary,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    P1
                  </span>
                  <span style={{
                    background: '#EFEFF4',
                    color: '#6E6E73',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    工作
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
