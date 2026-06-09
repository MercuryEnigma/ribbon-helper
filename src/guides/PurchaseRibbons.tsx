import type { Guide } from './guideTypes'

const purchaseRibbons: Guide = {
  id: 'purchase-ribbons',
  title: 'Purchase Ribbons',
  description: (
    <div className="purchase-ribbon-overview">
      <p><strong>Buy the Ribbons in ascending order:</strong> Gorgeous, Royal, then Gorgeous Royal.</p>
      <ul>
        <li><strong>Sinnoh:</strong> The Ribbon Syndicate sells the Ribbons in sequence. Entry requires at least 10 Ribbons across the current party.</li>
        <li><strong>ORAS:</strong> Ritzy Ribbon Retail sells the Ribbons in any order.</li>
      </ul>
      <p className="guide-warning"><strong>Transfer warning:</strong> ORAS allows a Pokémon to buy an expensive Ribbon without owning the cheaper ones. If it skips a cheaper ribbon and is transferred to BDSP, it can be permanently unable to buy the skipped ribbon.</p>
    </div>
  ),
  ribbonGuideEntries: [
    {
      ribbonId: 'gorgeous-ribbon',
      content: (
        <>
          <p className="purchase-ribbon-price"><strong>Price:</strong> 10,000 Pokédollars</p>
          <ul>
            <li><strong>DPPt/BDSP:</strong> Buy it at the Ribbon Syndicate in the Resort Area.</li>
            <li><strong>ORAS:</strong> Buy it at Ritzy Ribbon Retail, north of the Route 117 exit in Mauville City.</li>
          </ul>
        </>
      ),
    },
    {
      ribbonId: 'royal-ribbon',
      content: (
        <>
          <p className="purchase-ribbon-price"><strong>Price:</strong> 100,000 Pokédollars</p>
          <ul>
            <li><strong>DPPt/BDSP:</strong> The Ribbon Syndicate offers it after the Pokémon has the Gorgeous Ribbon.</li>
            <li><strong>ORAS:</strong> Ritzy Ribbon Retail sells it directly.</li>
          </ul>
        </>
      ),
    },
    {
      ribbonId: 'gorgeous-royal-ribbon',
      content: (
        <>
          <p className="purchase-ribbon-price"><strong>Price:</strong> 999,999 Pokédollars</p>
          <ul>
            <li><strong>DPPt/BDSP:</strong> The Ribbon Syndicate offers it after the Pokémon has the Royal Ribbon.</li>
            <li><strong>ORAS:</strong> Ritzy Ribbon Retail sells it directly.</li>
          </ul>
          <h3>Money recommendations</h3>
          <ul>
            <li>ORAS has a 9,999,999 cap and is substantially faster when buying Ribbons.</li>
            <li>I recommend using high-payout rematches with an Amulet Coin, O-Power Prize Money Power, or Happy Hour.</li>
            <li>I also recommend transferring Battle Points from Pokémon Bank or HOME, exchanging the BP for vitamins, and selling them.</li>
          </ul>
        </>
      ),
    },
  ],
}

export default purchaseRibbons
