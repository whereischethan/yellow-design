import React from 'react'
import { YL, Icons, Mono, Button, PageHeader, Avatar, fmtDate, Stack, ModalShell, ModalHeader, useIsMobile, formatPhone } from '../components/ui'
import { getTeam, addTeamMember, removeTeamMember } from '../api'

interface AdminUser {
  id: string
  phone: string
  name: string | null
  role: string
  created_at: string
}

const ROLE_STYLES: Record<string, { bg: string; fg: string }> = {
  superadmin: { bg: YL.ink,       fg: YL.yellow },
  ops:        { bg: YL.yellowSoft, fg: YL.ink },
}

function AddMemberModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (u: AdminUser) => void }) {
  const [phone, setPhone] = React.useState('')
  const [name, setName] = React.useState('')
  const [role, setRole] = React.useState<'ops' | 'superadmin'>('ops')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (open) { setPhone(''); setName(''); setRole('ops'); setError('') }
  }, [open])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '').slice(-10)
    if (digits.length !== 10) { setError('Enter a valid 10-digit number'); return }
    setLoading(true)
    setError('')
    try {
      const r: any = await addTeamMember({ phone: digits, name: name.trim() || null, role })
      onAdded(r.user)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px',
    border: `1.5px solid ${YL.line}`, borderRadius: 10,
    fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 14, color: YL.ink,
    background: YL.card, outline: 'none',
  }

  return (
    <ModalShell open={open} onClose={onClose} width={420}>
      <ModalHeader title="Add admin user" onClose={onClose} />
      <form onSubmit={handleAdd} style={{ padding: 24 }}>
        <Stack gap={18}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: YL.ink2, marginBottom: 6 }}>PHONE <span style={{ color: YL.gulmohar }}>*</span></div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${YL.line}`, borderRadius: 10, overflow: 'hidden', background: YL.card }}>
              <span style={{ padding: '0 10px', fontSize: 13, color: YL.ink2, fontFamily: '"JetBrains Mono", monospace', borderRight: `1px solid ${YL.line}`, height: 40, display: 'flex', alignItems: 'center', background: YL.bg, flexShrink: 0 }}>+91</span>
              <input
                value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number" maxLength={10} type="tel"
                style={{ ...inp, border: 'none', borderRadius: 0, flex: 1, fontFamily: '"JetBrains Mono", monospace' }} autoFocus
              />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: YL.ink2, marginBottom: 6 }}>NAME</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Display name (optional)" style={inp} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: YL.ink2, marginBottom: 8 }}>ROLE</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['ops', 'superadmin'] as const).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)} style={{
                  flex: 1, height: 38, borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${role === r ? YL.ink : YL.line}`,
                  background: role === r ? YL.ink : YL.card,
                  color: role === r ? YL.yellow : YL.ink,
                  fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13, fontWeight: 600,
                }}>
                  {r === 'ops' ? 'Ops' : 'Super Admin'}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div style={{ padding: '10px 14px', background: YL.redSoft, borderRadius: 10, fontSize: 13, color: YL.redInk }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" disabled={loading || phone.replace(/\D/g, '').length < 10} type="submit">
              {loading ? 'Adding…' : 'Add user'}
            </Button>
          </div>
        </Stack>
      </form>
    </ModalShell>
  )
}

export default function TeamPage({ selfPhone }: { selfPhone: string }) {
  const isMobile = useIsMobile()
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showAdd, setShowAdd] = React.useState(false)
  const [removing, setRemoving] = React.useState<string | null>(null)

  React.useEffect(() => {
    getTeam()
      .then((r: any) => setUsers(r.users))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (user: AdminUser) => {
    if (!window.confirm(`Remove ${user.name || user.phone} from admin access?`)) return
    setRemoving(user.id)
    try {
      await removeTeamMember(user.id)
      setUsers(prev => prev.filter(u => u.id !== user.id))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div style={{ flex: 1, overflow: 'hidden', background: YL.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <PageHeader
        title="Admin users"
        subtitle={`${users.length} user${users.length !== 1 ? 's' : ''} with dashboard access`}
        actions={<Button variant="primary" icon={<span style={{ width: 14, height: 14, display: 'flex' }}>{Icons.plus}</span>} onClick={() => setShowAdd(true)}>Add user</Button>}
      />

      {/* Column headers — desktop only */}
      {!isMobile && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 150px 120px 130px 44px',
          gap: 12, padding: '10px 28px',
          borderBottom: `1px solid ${YL.line}`, fontSize: 11, color: YL.ink2,
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0, background: YL.bg,
        }}>
          <div>User</div><div>Phone</div><div>Role</div><div>Added</div><div/>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '48px 28px', textAlign: 'center', color: YL.ink3, fontSize: 13 }}>Loading…</div>
        ) : users.map(u => {
          const normalize = (p: string) => p.replace(/\D/g, '').slice(-10)
          const isSelf = normalize(u.phone) === normalize(selfPhone)
          const rs = ROLE_STYLES[u.role] || ROLE_STYLES.ops
          if (isMobile) {
            return (
              <div key={u.id} style={{ padding: '13px 16px', borderBottom: `1px solid ${YL.line}`, background: YL.card, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={u.name || u.phone} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: YL.ink }}>
                      {u.name || <span style={{ color: YL.ink3, fontStyle: 'italic' }}>No name</span>}
                    </span>
                    {isSelf && <span style={{ fontSize: 10.5, color: YL.ink3 }}>(you)</span>}
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: rs.bg, color: rs.fg, marginLeft: 'auto' }}>
                      {u.role === 'superadmin' ? 'Super Admin' : 'Ops'}
                    </span>
                  </div>
                  <div style={{ marginTop: 3, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Mono size={12} color={YL.ink2}>{formatPhone(u.phone)}</Mono>
                    <span style={{ fontSize: 11, color: YL.ink3 }}>· {fmtDate(u.created_at)}</span>
                  </div>
                </div>
                {!isSelf && u.role !== 'superadmin' && (
                  <button
                    onClick={() => handleRemove(u)}
                    disabled={removing === u.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: YL.redInk, display: 'flex', padding: 6, borderRadius: 8, opacity: removing === u.id ? 0.4 : 1, flexShrink: 0 }}
                    title="Remove access"
                  >
                    <span style={{ width: 16, height: 16, display: 'flex' }}>{Icons.close}</span>
                  </button>
                )}
              </div>
            )
          }
          return (
            <div key={u.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 150px 120px 130px 44px',
              gap: 12, padding: '14px 28px', alignItems: 'center',
              borderBottom: `1px solid ${YL.line}`, background: YL.card,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={u.name || u.phone} size={32} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: YL.ink }}>
                    {u.name || <span style={{ color: YL.ink3, fontStyle: 'italic' }}>No name</span>}
                    {isSelf && <span style={{ marginLeft: 8, fontSize: 10.5, color: YL.ink3, fontWeight: 400 }}>(you)</span>}
                  </div>
                </div>
              </div>
              <Mono size={12}>{formatPhone(u.phone)}</Mono>
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: rs.bg, color: rs.fg }}>
                  {u.role === 'superadmin' ? 'Super Admin' : 'Ops'}
                </span>
              </div>
              <Mono size={11.5} color={YL.ink2}>{fmtDate(u.created_at)}</Mono>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {!isSelf && u.role !== 'superadmin' && (
                  <button
                    onClick={() => handleRemove(u)}
                    disabled={removing === u.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: YL.redInk, display: 'flex', padding: 4, borderRadius: 6, opacity: removing === u.id ? 0.4 : 1 }}
                    title="Remove access"
                  >
                    <span style={{ width: 15, height: 15, display: 'flex' }}>{Icons.close}</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {!loading && users.length === 0 && (
          <div style={{ padding: '48px 28px', textAlign: 'center', color: YL.ink3, fontSize: 13 }}>No admin users found.</div>
        )}
      </div>

      <AddMemberModal open={showAdd} onClose={() => setShowAdd(false)} onAdded={u => setUsers(prev => [...prev, u])} />
    </div>
  )
}
