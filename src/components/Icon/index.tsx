import React from 'react'
import classNames from 'classnames'
import './index.scss'

const prefixCls = 'portal-icon'

interface IconProps {
  type: string
  className?: string
  style?: React.CSSProperties
}

interface IconComponent extends React.FC<IconProps> {
  toString: (type: string, className?: string) => string
}

const Icon: IconComponent = (props) => {
  const {
    type,
    className,
    style,
  } = props

  return (
    <svg
      className={classNames(prefixCls, className)}
      aria-hidden="true"
      style={style}
    >
      <use xlinkHref={`#icon-${type}`}></use>
    </svg>
  )
}

Icon.toString = function (type: string, className?: string): string {
  return `<svg class="${prefixCls} ${className || ''}" aria-hidden="true">
            <use xlink:href='#icon-${type}'></use>
        </svg>`
}

export default Icon


