import { h } from 'vue'

export default {
  name: 'SimpleVue',
  render() {
    return h('div', { class: 'simple-vue' }, [
      h('h1', 'Simple Vue Component'),
      h('p', 'This is a simple Vue component for testing'),
      h('p', `Current time: ${new Date().toLocaleString('zh-CN')}`)
    ])
  }
}
