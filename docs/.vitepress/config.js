import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "DevFix | Autonomous AI Agent for Developers",
  description: "An open-source, autonomous AI agent that detects, diagnoses, and fixes broken local development environments and 'It works on my machine' errors.",
  sitemap: {
    hostname: 'https://devfix.ghulam-mustafa.com'
  },
  head: [
    ['link', { rel: 'icon', href: '/logo.png' }],
    ['meta', { name: 'keywords', content: 'AI agent, developer tools, DevFix, DevOps, autonomous debugging, fix broken environments, LLM coding assistant' }],
    ['meta', { name: 'author', content: 'Ghulam Mustafa' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'DevFix | Autonomous AI Agent for Developers' }],
    ['meta', { property: 'og:description', content: 'An open-source, autonomous AI agent that detects, diagnoses, and fixes broken local development environments.' }],
    ['meta', { property: 'og:url', content: 'https://devfix.ghulam-mustafa.com' }],
    ['meta', { property: 'og:image', content: 'https://devfix.ghulam-mustafa.com/og-banner.jpg' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://devfix.ghulam-mustafa.com/og-banner.jpg' }]
  ],
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Quick Start', link: '/quickstart' },
      { text: 'Changelog', link: '/changelog' }
    ],
    sidebar: [
      {
        text: 'Documentation',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Quick Start', link: '/quickstart' },
          { text: 'CLI Reference', link: '/cli-reference' },
          { text: 'Benchmarks', link: '/benchmarks' },
          { text: 'Improvement Changelog', link: '/changelog' },
          { text: 'Reproduction Guide', link: '/reproduction' },
          { text: 'Roadmap & Future Scope', link: '/roadmap' },
          { text: 'FAQ', link: '/faq' },
          { text: 'Contributing (PRs Welcome)', link: '/contributing' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/GhulamMustufa/devfix' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Ghulam Mustafa'
    }
  }
})
