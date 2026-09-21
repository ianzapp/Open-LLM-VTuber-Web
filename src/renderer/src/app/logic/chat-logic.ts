/** Keep following new messages only while the reader is at (or near) the bottom. */
export function isNearBottom(scrollTop: number, clientHeight: number, scrollHeight: number, slack = 48): boolean {
  return scrollHeight - (scrollTop + clientHeight) <= slack;
}

/** Height of the on-screen keyboard, from window.innerHeight and the visual viewport. */
export function keyboardInset(innerHeight: number, vvHeight: number, vvOffsetTop: number): number {
  return Math.max(0, Math.round(innerHeight - vvHeight - vvOffsetTop));
}
