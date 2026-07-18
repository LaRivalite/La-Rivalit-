const dummyData = {
  matchStatus: "live", // live | upcoming | none

  currentMatch: {
    trophy: "silver",

    battingFirst: {
      name: "Mavericks",
      short: "MAV",
      logo: "/logos/mavericks.png",
      score: "42/2",
      overs: "4.5"
    },

    battingSecond: {
      name: "Spartans",
      short: "SPA",
      logo: "/logos/spartans.png",
      score: "",
      overs: ""
    }
  },

  upcomingMatch: {
    trophy: "gold",
    date: "Saturday",
    time: "8:30 PM"
  }
};

export default dummyData;