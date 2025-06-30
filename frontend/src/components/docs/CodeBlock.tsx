import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
  showLineNumbers?: boolean
}

export function CodeBlock({ 
  code, 
  language = 'text', 
  className,
  showLineNumbers = false 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = code.split('\n')

  return (
    <div className={cn("relative group", className)}>
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={copyToClipboard}
          className="h-8 px-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <pre className={`language-${language} bg-gray-900 text-gray-100 rounded-lg p-4`}>
          <code>
            {showLineNumbers ? (
              <table className="w-full">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td className="text-gray-500 text-right pr-4 select-none w-12">
                        {i + 1}
                      </td>
                      <td>
                        <span dangerouslySetInnerHTML={{ __html: highlightSyntax(line, language) }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <span dangerouslySetInnerHTML={{ __html: highlightSyntax(code, language) }} />
            )}
          </code>
        </pre>
      </div>
    </div>
  )
}

// Basic syntax highlighting
function highlightSyntax(code: string, language: string): string {
  // This is a simple implementation. In production, you'd use a library like Prism.js or highlight.js
  
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  let highlighted = escapeHtml(code)

  if (language === 'json') {
    // Strings
    highlighted = highlighted.replace(/"([^"]+)":/g, '<span class="text-blue-400">"$1"</span>:')
    highlighted = highlighted.replace(/: "([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
    // Numbers
    highlighted = highlighted.replace(/: (\d+)/g, ': <span class="text-orange-400">$1</span>')
    // Booleans and null
    highlighted = highlighted.replace(/: (true|false|null)/g, ': <span class="text-purple-400">$1</span>')
  } else if (language === 'bash' || language === 'shell') {
    // Comments
    highlighted = highlighted.replace(/(#.*)$/gm, '<span class="text-gray-500">$1</span>')
    // Strings
    highlighted = highlighted.replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>')
    highlighted = highlighted.replace(/'([^']+)'/g, '<span class="text-green-400">\'$1\'</span>')
    // Flags
    highlighted = highlighted.replace(/(\s)(-\w+)/g, '$1<span class="text-yellow-400">$2</span>')
    // Commands
    highlighted = highlighted.replace(/^(\w+)/gm, '<span class="text-blue-400">$1</span>')
  } else if (language === 'javascript' || language === 'typescript') {
    // Keywords
    const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'async', 'await', 'import', 'export', 'class', 'new']
    keywords.forEach(keyword => {
      highlighted = highlighted.replace(new RegExp(`\\b${keyword}\\b`, 'g'), `<span class="text-purple-400">${keyword}</span>`)
    })
    // Strings
    highlighted = highlighted.replace(/'([^']+)'/g, '<span class="text-green-400">\'$1\'</span>')
    highlighted = highlighted.replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>')
    highlighted = highlighted.replace(/`([^`]+)`/g, '<span class="text-green-400">`$1`</span>')
    // Comments
    highlighted = highlighted.replace(/(\/\/.*)$/gm, '<span class="text-gray-500">$1</span>')
    // Numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>')
  } else if (language === 'python') {
    // Keywords
    const keywords = ['import', 'from', 'def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'with', 'as', 'True', 'False', 'None']
    keywords.forEach(keyword => {
      highlighted = highlighted.replace(new RegExp(`\\b${keyword}\\b`, 'g'), `<span class="text-purple-400">${keyword}</span>`)
    })
    // Strings
    highlighted = highlighted.replace(/'([^']+)'/g, '<span class="text-green-400">\'$1\'</span>')
    highlighted = highlighted.replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>')
    // Comments
    highlighted = highlighted.replace(/(#.*)$/gm, '<span class="text-gray-500">$1</span>')
    // Numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>')
  } else if (language === 'php') {
    // PHP tags
    highlighted = highlighted.replace(/(&lt;\?php|&lt;\?|\?&gt;)/g, '<span class="text-red-400">$1</span>')
    // Variables
    highlighted = highlighted.replace(/(\$\w+)/g, '<span class="text-blue-400">$1</span>')
    // Keywords
    const keywords = ['echo', 'print', 'if', 'else', 'elseif', 'for', 'foreach', 'while', 'function', 'return', 'class', 'public', 'private', 'protected', 'new']
    keywords.forEach(keyword => {
      highlighted = highlighted.replace(new RegExp(`\\b${keyword}\\b`, 'g'), `<span class="text-purple-400">${keyword}</span>`)
    })
    // Strings
    highlighted = highlighted.replace(/'([^']+)'/g, '<span class="text-green-400">\'$1\'</span>')
    highlighted = highlighted.replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>')
  }

  return highlighted
}