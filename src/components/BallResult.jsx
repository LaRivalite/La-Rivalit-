export default function BallResult({ ball }) {

  let text =
    ball.wicket
      ? "WICKET"
      : ball.totalRuns === 0
        ? "Dot ball"
        : `${ball.totalRuns} run${ball.totalRuns > 1 ? "s" : ""}`;


  let color = "text-zinc-300";

  if (ball.wicket) {
    color = "text-red-400";
  } 
  else if (ball.runsOffBat === 6 || ball.runs_off_bat === 6) {
    color = "text-purple-400";
  }
  else if (ball.runsOffBat === 4 || ball.runs_off_bat === 4) {
    color = "text-green-400";
  }


  return (
    <p className={`font-bold mt-1 ${color}`}>
      {text}
    </p>
  );
}