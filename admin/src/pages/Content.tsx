import { YL, Button, Card, PageHeader } from '../components/ui'

function ContentField({ label, where, defaultValue, multiline }: any) {
  return (
    <div style={{ padding: '18px 0', borderBottom: `1px solid ${YL.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontSize: 13.5, color: YL.ink, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: YL.ink3 }}>{where}</div>
      </div>
      {multiline ? (
        <textarea defaultValue={defaultValue} rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: YL.card, border: `1px solid ${YL.line}`, borderRadius: 8, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13, color: YL.ink, resize: 'vertical', outline: 'none' }}/>
      ) : (
        <input defaultValue={defaultValue} style={{ width: '100%', boxSizing: 'border-box', height: 36, padding: '0 12px', background: YL.card, border: `1px solid ${YL.line}`, borderRadius: 8, fontFamily: '"Bricolage Grotesque", system-ui', fontSize: 13, color: YL.ink, outline: 'none' }}/>
      )}
    </div>
  )
}

export default function Content() {
  return (
    <div style={{ flex: 1, overflow: 'auto', background: YL.bg }}>
      <PageHeader title="Content" subtitle="App copy that ops can update"
        actions={<><Button variant="secondary">Preview in app</Button><Button variant="primary">Publish changes</Button></>}/>
      <div style={{ padding: '24px 28px', maxWidth: 760 }}>
        <Card>
          <ContentField label="Home announcement" where="Yellow banner on home screen" defaultValue="New route: Mysuru now available"/>
          <ContentField label="Vehicle display name" where="Vehicle selection screen" defaultValue="Yellow Sky"/>
          <ContentField label="Vehicle description" where="Vehicle selection screen" defaultValue="Kia Carens Clavis · EV · 6 seats"/>
          <ContentField label="Support WhatsApp number" where="Support screen, help flows" defaultValue="918628062808"/>
          <ContentField label="Referral reward amount" where="Referral screen" defaultValue="₹200"/>
          <ContentField label="Outstation info text" where="Info card · outstation screen" defaultValue="Inter-state permits, fuel & driver bata included." multiline/>
          <ContentField label="Hourly info text" where="Info card · hourly screen" defaultValue="Unlimited kms within Bangalore city limits." multiline/>
        </Card>
      </div>
    </div>
  )
}
