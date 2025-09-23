import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'
import { MobileSearch } from '@/shared/components/navigation/MobileSearch'

const meta: Meta<typeof MobileSearch> = {
  title: 'Mobile/MobileSearch',
  component: MobileSearch,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A mobile-first search component with voice recognition and suggestion system.'
      }
    }
  },
  argTypes: {
    enableVoiceSearch: {
      control: 'boolean',
      description: 'Enable voice search functionality'
    },
    enableFilters: {
      control: 'boolean',
      description: 'Show filters button'
    },
    compact: {
      control: 'boolean',
      description: 'Use compact layout'
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text'
    },
    filterCount: {
      control: { type: 'number', min: 0, max: 10 },
      description: 'Number of active filters'
    }
  }
}

export default meta
type Story = StoryObj<typeof MobileSearch>

const SearchStory = ({ onSubmit, ...props }: any) => {
  const [value, setValue] = useState('')

  return (
    <div className="max-w-md mx-auto space-y-4">
      <MobileSearch
        {...props}
        value={value}
        onChange={setValue}
        onSubmit={(searchValue) => {
          console.log('Search submitted:', searchValue)
          onSubmit?.(searchValue)
        }}
      />
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Current value: &quot;{value}&quot;
      </div>
    </div>
  )
}

export const Default: Story = {
  render: (args) => <SearchStory {...args} />,
  args: {
    placeholder: 'Search...',
    enableVoiceSearch: true,
    enableFilters: true,
    filterCount: 0,
    compact: false,
    suggestions: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
    recentSearches: ['User management', 'Dashboard widgets', 'Mobile navigation'],
    popularSearches: ['Getting started', 'API docs', 'Components', 'Examples']
  }
}

export const WithSuggestions: Story = {
  render: (args) => <SearchStory {...args} />,
  args: {
    placeholder: 'Search documentation...',
    enableVoiceSearch: true,
    enableFilters: false,
    compact: false,
    suggestions: [
      'Mobile sidebar component',
      'Responsive dashboard',
      'Voice search integration',
      'Gesture navigation',
      'Bottom navigation'
    ],
    recentSearches: ['Mobile components', 'Storybook setup', 'Jest testing'],
    popularSearches: ['Quick start', 'Components', 'Hooks', 'Utils']
  }
}

export const CompactMode: Story = {
  render: (args) => <SearchStory {...args} />,
  args: {
    placeholder: 'Quick search...',
    enableVoiceSearch: false,
    enableFilters: true,
    filterCount: 3,
    compact: true
  }
}

export const WithFilters: Story = {
  render: (args) => <SearchStory {...args} />,
  args: {
    placeholder: 'Search with filters...',
    enableVoiceSearch: true,
    enableFilters: true,
    filterCount: 5,
    compact: false,
    suggestions: ['Filtered results', 'Advanced search', 'Custom filters'],
    onFiltersClick: () => console.log('Filters clicked')
  }
}

export const VoiceSearchOnly: Story = {
  render: (args) => <SearchStory {...args} />,
  args: {
    placeholder: 'Try voice search...',
    enableVoiceSearch: true,
    enableFilters: false,
    compact: false,
    suggestions: ['Voice command examples', 'Speech recognition', 'Audio input']
  }
}

export const NoVoiceSearch: Story = {
  render: (args) => <SearchStory {...args} />,
  args: {
    placeholder: 'Text search only...',
    enableVoiceSearch: false,
    enableFilters: true,
    filterCount: 0,
    compact: false,
    suggestions: ['Manual typing', 'Keyboard input', 'Traditional search']
  }
}

export const LongSuggestions: Story = {
  render: (args) => <SearchStory {...args} />,
  args: {
    placeholder: 'Search for anything...',
    enableVoiceSearch: true,
    enableFilters: true,
    compact: false,
    suggestions: [
      'How to implement mobile-responsive navigation improvements',
      'Creating touch-friendly user interfaces with gesture support',
      'Advanced search and filtering functionality',
      'Voice recognition and speech-to-text integration',
      'Progressive web app features and offline synchronization'
    ],
    recentSearches: [
      'Mobile navigation best practices',
      'React component testing with Jest',
      'Storybook documentation and examples'
    ],
    popularSearches: [
      'Getting started guide',
      'Component library',
      'Mobile optimization',
      'Performance tips'
    ]
  }
}

export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState('')
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [recentSearches, setRecentSearches] = useState([
      'Previous search 1',
      'Previous search 2'
    ])

    const handleSubmit = (searchValue: string) => {
      console.log('Search submitted:', searchValue)
      if (searchValue.trim() && !recentSearches.includes(searchValue)) {
        setRecentSearches(prev => [searchValue, ...prev.slice(0, 4)])
      }
    }

    const handleChange = (newValue: string) => {
      setValue(newValue)
      
      // Simulate dynamic suggestions
      if (newValue.length > 1) {
        const mockSuggestions = [
          `${newValue} component`,
          `${newValue} documentation`,
          `${newValue} examples`,
          `${newValue} tutorial`
        ]
        setSuggestions(mockSuggestions)
      } else {
        setSuggestions([])
      }
    }

    return (
      <div className="max-w-md mx-auto space-y-4">
        <MobileSearch
          value={value}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="Interactive search..."
          enableVoiceSearch={true}
          enableFilters={true}
          suggestions={suggestions}
          recentSearches={recentSearches}
          popularSearches={['React', 'TypeScript', 'Next.js', 'Storybook']}
          onFiltersClick={() => console.log('Filters clicked')}
        />
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>This search has dynamic suggestions and remembers recent searches.</p>
          <p>Current value: &quot;{value}&quot;</p>
          <p>Recent searches: {recentSearches.length}</p>
        </div>
      </div>
    )
  }
}