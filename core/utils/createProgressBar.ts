import type { ProgressBar } from "types";

export default function createBar(props: ProgressBar) {
  const { progress, size, completeChar, incompleteChar } = props;
  const completeLength = Math.round(progress * size);
  const incompleteLength = size - completeLength;
  return (
    completeChar.repeat(completeLength) +
    incompleteChar.repeat(incompleteLength)
  );
}
