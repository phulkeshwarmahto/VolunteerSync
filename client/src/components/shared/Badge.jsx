const VARIANT_CLASS_MAP = {
  default: 'badge',
  success: 'badge badge--success',
  warning: 'badge badge--warning',
  danger: 'badge badge--danger',
  info: 'badge badge--info',
};

export default function Badge({ children, variant = 'default' }) {
  return <span className={VARIANT_CLASS_MAP[variant] || VARIANT_CLASS_MAP.default}>{children}</span>;
}
