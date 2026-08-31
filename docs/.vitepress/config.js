import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "DevFix",
  description: "An autonomous AI agent for recovering broken developer environments.",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Changelog', link: '/changelog' }
    ],
    sidebar: [
      {
        text: 'Documentation',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Improvement Changelog', link: '/changelog' },
          { text: 'Roadmap & Future Scope', link: '/#roadmap-future-scope' },
          { text: 'Contributing (PRs Welcome)', link: '/#contributing-awaiting-prs' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ghulam-mustafa/devfix' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Ghulam Mustafa'
    }
  }
})
