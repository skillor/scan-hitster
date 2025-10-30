    // "updated_on": 1761563793,
    // "gamesets": [
    //     {
    //         "sku": "aaaa0005",
    //         "gameset_data": {
    //             "gameset_language": "United Kingdom",
    //             "gameset_name": "",
    //             "cards": [
    //                 {
    //                     "CardNumber": "00001",
    //                     "Spotify": "0KMGxYKeUzK9wc5DZCt3HT"
interface Gameset {
  sku: string,
  gameset_data: {
    gameset_language: string,
    cards: {
      CardNumber: string,
      Spotify: string,
    }[],
  },
}

export interface Gamesets {
  updated_on: number,
  gamesets: Gameset[];
}
