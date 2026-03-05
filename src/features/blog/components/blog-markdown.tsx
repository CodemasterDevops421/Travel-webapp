import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';

type BlogMarkdownProps = {
  content: string;
};

export function BlogMarkdown({ content }: BlogMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug, rehypeSanitize]}
      components={{
        h2: ({ children, ...props }) => (
          <h2 className="mt-10 scroll-mt-28 text-2xl font-bold leading-tight" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="mt-8 scroll-mt-28 text-xl font-bold leading-tight" {...props}>
            {children}
          </h3>
        ),
        p: ({ children, ...props }) => (
          <p className="mt-4 text-base leading-8 text-foreground/95" {...props}>
            {children}
          </p>
        ),
        ul: ({ children, ...props }) => (
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-7 text-foreground/95" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-base leading-7 text-foreground/95" {...props}>
            {children}
          </ol>
        ),
        li: ({ children, ...props }) => <li {...props}>{children}</li>,
        a: ({ children, ...props }) => (
          <a className="text-primary underline underline-offset-4 hover:text-primary/80" {...props}>
            {children}
          </a>
        ),
        blockquote: ({ children, ...props }) => (
          <blockquote className="mt-4 border-l-4 border-primary/40 bg-muted/40 px-4 py-2 text-sm italic" {...props}>
            {children}
          </blockquote>
        ),
        code: ({ children, ...props }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" {...props}>
            {children}
          </code>
        ),
        pre: ({ children, ...props }) => (
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-slate-100" {...props}>
            {children}
          </pre>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

