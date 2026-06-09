import type { Guide, RibbonGuideEntry } from './guideTypes'

type DailyRibbon = {
  ribbonId: string
  day: string
  sibling: string
  johtoLocation: string
  kalosHotel: string
}

const dailyRibbons: DailyRibbon[] = [
  { ribbonId: 'alert-ribbon', day: 'Monday', sibling: 'Monica', johtoLocation: 'Route 40', kalosHotel: 'Hotel Ambrette' },
  { ribbonId: 'shock-ribbon', day: 'Tuesday', sibling: 'Tuscany', johtoLocation: 'Route 29', kalosHotel: 'Hotel Camphrier' },
  { ribbonId: 'downcast-ribbon', day: 'Wednesday', sibling: 'Wesley', johtoLocation: 'the Lake of Rage', kalosHotel: 'Hotel Marine Snow in Geosenge Town' },
  { ribbonId: 'careless-ribbon', day: 'Thursday', sibling: 'Arthur', johtoLocation: 'Route 36', kalosHotel: 'Coumarine Hotel' },
  { ribbonId: 'relax-ribbon', day: 'Friday', sibling: 'Frieda', johtoLocation: 'Route 32', kalosHotel: 'Couriway Hotel' },
  { ribbonId: 'snooze-ribbon', day: 'Saturday', sibling: 'Santos', johtoLocation: 'Blackthorn City', kalosHotel: 'Hotel Cyllage' },
  { ribbonId: 'smile-ribbon', day: 'Sunday', sibling: 'Sunny', johtoLocation: 'Route 37', kalosHotel: 'Coumarine Hotel' },
]

function createDailyEntry({ ribbonId, day, sibling, johtoLocation, kalosHotel }: DailyRibbon): RibbonGuideEntry {
  return {
    ribbonId,
    content: (
      <>
        <p>Available on <strong>{day}</strong>.</p>
        <ul>
          <li><strong>DPPt/BDSP:</strong> Julia's house in northeastern Sunyshore City.</li>
          <li><strong>HGSS:</strong> {sibling} at {johtoLocation}, after meeting all seven Week Siblings once.</li>
          <li><strong>XY:</strong> the female Tourist on the second floor of {kalosHotel}.</li>
          <li><strong>ORAS:</strong> Ribbon Belle in Apartment 2 in the north hall of Mauville Hills.</li>
        </ul>
      </>
    ),
  }
}

const dailyRibbonGuide: Guide = {
  id: 'daily-ribbons',
  title: 'Daily Ribbons',
  description: (
    <>
      <p>Multiple games award a ribbon depending on the day of the week by talking to an NPC. ORAS is the fastest option because each ribbon is awarded to the entire party.</p>
      <p className="guide-warning"><strong>Clock warning:</strong> Changing the system clock can temporarily prevent these NPCs from awarding ribbons.</p>
    </>
  ),
  ribbonGuideEntries: dailyRibbons.map(createDailyEntry),
}

export default dailyRibbonGuide
