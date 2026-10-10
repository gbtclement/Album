// Affiché pendant le chargement d'une page (navigation et rendu à la requête) : un vinyle qui tourne
export default function Loading() {
  return (
    <main className="landing">
      <div className="big-pack" role="status" aria-label="Chargement">
        <div className="disc" style={{ width: 90, height: 90, borderWidth: 4 }}>
          <div className="disc-rot" style={{ animationDuration: "1.4s" }}><span className="hub" style={{ width: 30, height: 30 }} /></div>
          <span className="sheen" />
        </div>
        <p className="sub">Chargement...</p>
      </div>
    </main>
  );
}
