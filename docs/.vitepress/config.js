import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "DevFix",
  description: "An autonomous AI agent for recovering broken developer environments.",
  head: [['link', { rel: 'icon', href: '/logo.png' }]],
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
