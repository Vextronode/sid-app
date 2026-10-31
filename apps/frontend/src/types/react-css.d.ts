// CSS custom property (mis. `--sid-login-bg`) boleh dipakai di prop `style`.
import 'react'

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined
  }
}
