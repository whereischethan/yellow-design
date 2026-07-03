import { YL, STATUS_STYLE, Icons, Mono, Input, Chip, useIsMobile } from '../../components/ui'

export function FilterBar({ statusFilter, setStatusFilter, search, setSearch, tripType, setTripType, paymentFilter, setPaymentFilter, counts }: any) {
  const isMobile = useIsMobile()
  const statuses = ['pending', 'confirmed', 'assigned', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show']

  if (isMobile) {
    return (
      <div style={{ padding: '10px 12px', background: YL.bg, borderBottom: `1px solid ${YL.line}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Input value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Search code, name, flight…" icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.search}</span>}/>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 } as any}>
          <Chip active={statusFilter.length === 0} onClick={() => setStatusFilter([])}>All <Mono size={11} color={statusFilter.length === 0 ? YL.yellow : YL.ink2}>{counts.total}</Mono></Chip>
          {statuses.map(s => (
            <Chip key={s} active={statusFilter.includes(s)} onClick={() => setStatusFilter((p: string[]) => p.includes(s) ? p.filter((x: string) => x !== s) : [...p, s])}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: STATUS_STYLE[s].fg, opacity: 0.7, flexShrink: 0 }}/>
              {STATUS_STYLE[s].label}
            </Chip>
          ))}
          <div style={{ width: 1, height: 1, background: YL.line, flexShrink: 0, alignSelf: 'stretch' }}/>
          {(['all', 'pickup', 'drop'] as const).map(t => (
            <Chip key={t} active={tripType === t} onClick={() => setTripType(t)}>
              {t === 'all' ? 'Both' : t === 'pickup' ? '← Pick' : 'Drop →'}
            </Chip>
          ))}
          <div style={{ width: 1, height: 1, background: YL.line, flexShrink: 0, alignSelf: 'stretch' }}/>
          {(['paid', 'unpaid'] as const).map(p => (
            <Chip key={p} active={paymentFilter === p} onClick={() => setPaymentFilter(paymentFilter === p ? '' : p)}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: p === 'paid' ? YL.leaf : YL.gulmohar, flexShrink: 0 }}/>
              {p === 'paid' ? 'Paid' : 'Unpaid'}
            </Chip>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 28px', background: YL.bg, borderBottom: `1px solid ${YL.line}`, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Input value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Search code, name, flight…" icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.search}</span>} style={{ width: 280 }}/>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Chip active={statusFilter.length === 0} onClick={() => setStatusFilter([])}>All <Mono size={11} color={statusFilter.length === 0 ? YL.yellow : YL.ink2}>{counts.total}</Mono></Chip>
        {statuses.map(s => (
          <Chip key={s} active={statusFilter.includes(s)} onClick={() => setStatusFilter((p: string[]) => p.includes(s) ? p.filter((x: string) => x !== s) : [...p, s])}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: STATUS_STYLE[s].fg, opacity: 0.7 }}/>
            {STATUS_STYLE[s].label}
            <Mono size={11} color={statusFilter.includes(s) ? YL.yellow : YL.ink2}>{counts[s] || 0}</Mono>
          </Chip>
        ))}
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['all', 'pickup', 'drop'] as const).map(t => (
          <Chip key={t} active={tripType === t} onClick={() => setTripType(t)}>
            {t === 'all' ? 'Both' : t === 'pickup' ? 'Pickup ←' : 'Drop →'}
          </Chip>
        ))}
      </div>
      <div style={{ width: 1, height: 20, background: YL.line, flexShrink: 0 }}/>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['paid', 'unpaid'] as const).map(p => (
          <Chip key={p} active={paymentFilter === p} onClick={() => setPaymentFilter(paymentFilter === p ? '' : p)}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: p === 'paid' ? YL.leaf : YL.gulmohar, flexShrink: 0 }}/>
            {p === 'paid' ? 'Paid' : 'Unpaid'}
          </Chip>
        ))}
      </div>
    </div>
  )
}
