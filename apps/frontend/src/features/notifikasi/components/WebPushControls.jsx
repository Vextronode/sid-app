import useWebPushSubscription from '../hooks/useWebPushSubscription'

export default function WebPushControls() {
  const { supported, subscribed, loading, error, enable, disable } = useWebPushSubscription()

  if (!supported) return null

  return (
    <section className="sid-webpush-controls" aria-label="Notifikasi browser">
      <div>
        <p className="sid-webpush-title">Notifikasi browser</p>
        <p className="sid-webpush-description">
          {subscribed ? 'Push aktif di browser ini.' : 'Aktifkan agar kabar surat masuk ke browser.'}
        </p>
      </div>

      <button
        type="button"
        onClick={subscribed ? disable : enable}
        disabled={loading}
        className="sid-notification-mark-all"
      >
        {loading ? 'Menyimpan...' : subscribed ? 'Nonaktifkan' : 'Aktifkan push'}
      </button>

      {error && <p className="sid-webpush-error" role="alert">{error}</p>}
    </section>
  )
}
