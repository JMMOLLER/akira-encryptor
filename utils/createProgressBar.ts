interface ProgressBarProps {
  /**
   * Progress value between 0 and 1
   */
  progress: number;
  /**
   * Size of the progress bar
   */
  size: number;
  /**
   * Character to represent the completed part of the progress bar
   */
  completeChar: string;
  /**
   * Character to represent the incomplete part of the progress bar
   */
  incompleteChar: string;
}

export default function createBar(props: ProgressBarProps) {
  const { progress, size, completeChar, incompleteChar } = props;
  const completeLength = Math.round(progress * size);
  const incompleteLength = size - completeLength;
  return (
    completeChar.repeat(completeLength) +
    incompleteChar.repeat(incompleteLength)
  );
}
