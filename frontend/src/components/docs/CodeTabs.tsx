import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodeBlock } from './CodeBlock'

interface CodeExample {
  label: string
  value: string
  code: string
  language: string
}

interface CodeTabsProps {
  examples: CodeExample[]
  defaultValue?: string
}

export function CodeTabs({ examples, defaultValue }: CodeTabsProps) {
  return (
    <Tabs defaultValue={defaultValue || examples[0]?.value} className="w-full">
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${examples.length}, 1fr)` }}>
        {examples.map((example) => (
          <TabsTrigger key={example.value} value={example.value}>
            {example.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {examples.map((example) => (
        <TabsContent key={example.value} value={example.value} className="mt-4">
          <CodeBlock code={example.code} language={example.language} />
        </TabsContent>
      ))}
    </Tabs>
  )
}