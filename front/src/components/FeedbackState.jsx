/**
 * Shared feedback primitives used by data-driven screens.
 * The caller keeps ownership of loading/error/empty state and retry behavior.
 */
export function LoadingState({ children, className = '', compact = false }) {
  const classes = ['ui-state', 'ui-state-loading', compact ? 'ui-state-compact' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} role="status">
      <span className="ui-state-spinner" aria-hidden="true" />
      <span className="ui-state-message">{children}</span>
    </div>
  )
}

export function ErrorMessage({
  children,
  className = '',
  actionLabel,
  onAction,
  actionClassName = 'button button-secondary button-small',
}) {
  const classes = ['ui-feedback', 'ui-feedback-error', className].filter(Boolean).join(' ')

  return (
    <div className={classes} role="alert">
      <span className="ui-feedback-message">{children}</span>
      {actionLabel && onAction && (
        <button type="button" className={actionClassName} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export function SuccessMessage({ children, className = '', as = 'div' }) {
  const Element = as
  const classes = ['ui-success-message', className].filter(Boolean).join(' ')

  return (
    <Element className={classes} role="status">
      <span className="ui-success-icon" aria-hidden="true">✓</span>
      <span>{children}</span>
    </Element>
  )
}

export function EmptyState({ className = '', icon, title, description, children }) {
  const classes = ['ui-empty-state', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {icon && <span className="ui-empty-icon" aria-hidden="true">{icon}</span>}
      {title && <strong>{title}</strong>}
      {description && <p>{description}</p>}
      {children}
    </div>
  )
}
