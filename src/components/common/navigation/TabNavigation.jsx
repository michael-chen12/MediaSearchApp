import Button from '../../base/Button';
import Nav from '../../base/Nav';

export default function TabNavigation({ tabs, activeTab, onTabChange }) {
  const handleTabClick = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <Nav variant="tabs" ariaLabel="Tab navigation">
      <Nav variant="horizontal">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              variant={isActive ? 'tab-active' : 'tab'}
              size="tab"
              className={`
                rounded-t-lg
                ${
                  isActive
                    ? 'bg-primary-600 text-white dark:bg-primary-500 border-primary-600 dark:border-primary-500'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`
                      px-2 py-0.5 text-xs rounded-full font-semibold
                      ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }
                    `}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
            </Button>
          );
        })}
      </Nav>
    </Nav>
  );
}
