import TransitionEvents from './css-animation/Event';
import raf from '../_util/raf';
let styleForPesudo;

// Where el is the DOM element you'd like to test for visibility
function isHidden(element) {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }
  return !element || element.offsetParent === null;
}

export default {
  name: 'Wave',
  props: ['insertExtraNode'],
  mounted() {
    this.$nextTick(() => {
      const node = this.$el;
      if (node.nodeType !== 1) {
        return;
      }
      this.instance = this.bindAnimationEvent(node);
    });
  },

  beforeDestroy() {
    if (this.instance) {
      this.instance.cancel();
    }
    if (this.clickWaveTimeoutId) {
      clearTimeout(this.clickWaveTimeoutId);
    }
    this.destroy = true;
  },
  methods: {
    isNotGrey(color) {
      const match = (color || '').match(/rgba?\((\d*), (\d*), (\d*)(, [\.\d]*)?\)/);
      if (match && match[1] && match[2] && match[3]) {
        return !(match[1] === match[2] && match[2] === match[3]);
      }
      return true;
    },

    onClick(node, waveColor) {
      if (!node || isHidden(node) || node.className.indexOf('-leave') >= 0) {
        return;
      }
      this.removeExtraStyleNode();
      const { insertExtraNode } = this.$props;
      this.extraNode = document.createElement('div');
      const extraNode = this.extraNode;
      extraNode.className = 'gov-click-animating-node';
      const attributeName = this.getAttributeName();
      node.removeAttribute(attributeName);
      node.setAttribute(attributeName, 'true');
      // Not white or transparnt or grey
      styleForPesudo = styleForPesudo || document.createElement('style');
      if (
        waveColor &&
        waveColor !== '#ffffff' &&
        waveColor !== 'rgb(255, 255, 255)' &&
        this.isNotGrey(waveColor) &&
        !/rgba\(\d*, \d*, \d*, 0\)/.test(waveColor) && // any transparent rgba color
        waveColor !== 'transparent'
      ) {
        extraNode.style.borderColor = waveColor;

        styleForPesudo.innerHTML = `[ant-click-animating-without-extra-node]:after { border-color: ${waveColor}; }`;
        if (!document.body.contains(styleForPesudo)) {
          document.body.appendChild(styleForPesudo);
        }
      }
      if (insertExtraNode) {
        node.appendChild(extraNode);
      }
      TransitionEvents.addStartEventListener(node, this.onTransitionStart);
      TransitionEvents.addEndEventListener(node, this.onTransitionEnd);
    },

    bindAnimationEvent(node) {
      if (
        !node ||
        !node.getAttribute ||
        node.getAttribute('disabled') ||
        node.className.indexOf('disabled') >= 0
      ) {
        return;
      }
      const onClick = e => {
        // Fix radio button click twice
        if (e.target.tagName === 'INPUT' || isHidden(e.target)) {
          return;
        }
        this.resetEffect(node);
        // Get wave color from target
        const waveColor =
          getComputedStyle(node).getPropertyValue('border-top-color') || // Firefox Compatible
          getComputedStyle(node).getPropertyValue('border-color') ||
          getComputedStyle(node).getPropertyValue('background-color');
        this.clickWaveTimeoutId = window.setTimeout(() => this.onClick(node, waveColor), 0);
        raf.cancel(this.animationStartId);
        this.animationStart = true;

        // Render to trigger transition event cost 3 frames. Let's delay 10 frames to reset this.
        this.animationStartId = raf(() => {
          this.animationStart = false;
        }, 10);
      };
      node.addEventListener('click', onClick, true);
      return {
        cancel: () => {
          node.removeEventListener('click', onClick, true);
        },
      };
    },
    getAttributeName() {
      const { insertExtraNode } = this.$props;
      return insertExtraNode ? 'gov-click-animating' : 'gov-click-animating-without-extra-node';
    },

    resetEffect(node) {
      if (!node || node === this.extraNode || !(node instanceof Element)) {
        return;
      }
      const { insertExtraNode } = this.$props;
      const attributeName = this.getAttributeName();
      node.removeAttribute(attributeName);
      this.removeExtraStyleNode();
      if (insertExtraNode && this.extraNode && node.contains(this.extraNode)) {
        node.removeChild(this.extraNode);
      }
      TransitionEvents.removeStartEventListener(node, this.onTransitionStart);
      TransitionEvents.removeEndEventListener(node, this.onTransitionEnd);
    },
    onTransitionStart(e) {
      if (this.destroy) return;

      const node = this.$el;
      if (!e || e.target !== node) {
        return;
      }

      if (!this.animationStart) {
        this.resetEffect(node);
      }
    },
    onTransitionEnd(e) {
      if (!e || e.animationName !== 'fadeEffect') {
        return;
      }
      this.resetEffect(e.target);
    },
    removeExtraStyleNode() {
      if (styleForPesudo) {
        styleForPesudo.innerHTML = '';
      }
    },
  },

  render() {
    return this.$slots.default && this.$slots.default[0];
  },
};
