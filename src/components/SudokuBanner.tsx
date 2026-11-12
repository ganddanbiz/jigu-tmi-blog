export default function SudokuBanner() {
  return (
    <a
      className="sudoku-banner"
      href="https://tugman77.github.io/maeil-sudoku/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="매일 스도쿠, 매일 새 문제 무료로 풀기 (새 탭에서 열림)"
    >
      <span className="sudoku-banner-mark" aria-hidden="true">
        <span>1</span><span>2</span><span>3</span>
        <span>4</span><span className="sudoku-banner-mark-accent">5</span><span>6</span>
        <span>7</span><span>8</span><span>9</span>
      </span>
      <span className="sudoku-banner-copy">
        <span className="sudoku-banner-title">상식 한 입 뒤에는 두뇌 한 판, 매일 스도쿠</span>
        <span className="sudoku-banner-subtitle">매일 새 문제, 무료</span>
      </span>
      <span className="sudoku-banner-button">
        스도쿠 풀기 <span aria-hidden="true">↗</span>
      </span>
    </a>
  );
}
