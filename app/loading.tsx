// Affiché pendant le chargement d'une page (navigation et rendu à la requête) : un vinyle qui tourne,
// centré sur l'écran (sous la barre d'infos et la barre de jeu)
export default function Loading() {
  return (
    <div className="page-loader" role="status" aria-label="Chargement">
      <div className="disc">
        <div className="disc-rot"><span className="hub" /></div>
        <span className="sheen" />
      </div>
      <p className="sub">Chargement...</p>
    </div>
  );
}
