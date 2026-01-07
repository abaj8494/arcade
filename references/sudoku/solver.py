from typing import List

class Solution:
    def solveSudoku(self, board: List[List[str]]) -> None:
        N = len(board)
        empties = []

        # ------------------------------------------------------------------
        # (Kept from your code, but no longer used in the main DFS)
        # ------------------------------------------------------------------
        def fullGroup(group: List[str]) -> bool:
            uniques = list(set(group))
            if len(uniques) != N:
                return False
            return True

        def checkGroup(group: List[str]) -> bool:
            seen = set()
            for ch in group:
                if ch == '.':
                    continue
                if ch in seen:
                    return False
                seen.add(ch)
            return True

        def isSolved() -> bool:
            # Full-board validator, not used inside DFS now
            # check rows:
            for row in board:
                if not (checkGroup(row) and fullGroup(row)):
                    return False

            # check columns:
            for i in range(N):
                col = [row[i] for row in board]
                if not (checkGroup(col) and fullGroup(col)):
                    return False

            # check grids:
            for row_offset in range(0, N, 3):
                for col_offset in range(0, N, 3):
                    subgrid = []
                    for r in range(row_offset, row_offset + 3):
                        for c in range(col_offset, col_offset + 3):
                            subgrid.append(board[r][c])
                    if not (checkGroup(subgrid) and fullGroup(subgrid)):
                        return False
            return True

        # ------------------------------------------------------------------
        # NEW: O(1) constraint tracking with minimal changes to structure
        # ------------------------------------------------------------------
        rows  = [set() for _ in range(N)]
        cols  = [set() for _ in range(N)]
        boxes = [set() for _ in range(N)]  # index = (r//3)*3 + c//3

        def find_empties():
            for i, row in enumerate(board):
                for j, val in enumerate(row):
                    if val == '.':
                        empties.append((i, j))
                    else:
                        rows[i].add(val)
                        cols[j].add(val)
                        boxes[(i // 3) * 3 + (j // 3)].add(val)

        # reuse your validMove name/signature, but now use the row/col/box sets
        def validMove(board_state: List[List[str]], pos: tuple) -> List[str]:
            r, c = pos
            b = (r // 3) * 3 + (c // 3)
            valid_moves = []
            for d in "123456789":
                if d not in rows[r] and d not in cols[c] and d not in boxes[b]:
                    valid_moves.append(d)
            return valid_moves

        # ------------------------------------------------------------------
        # DFS using index into `empties` (no pop/append, no full-board checks)
        # ------------------------------------------------------------------
        def dfs_rec(idx: int) -> bool:
            if idx == len(empties):
                return True  # all empties filled legally

            r, c = empties[idx]
            if board[r][c] != '.':
                return dfs_rec(idx + 1)

            b = (r // 3) * 3 + (c // 3)
            for move in validMove(board, (r, c)):
                # place
                board[r][c] = move
                rows[r].add(move)
                cols[c].add(move)
                boxes[b].add(move)

                if dfs_rec(idx + 1):
                    return True

                # undo
                board[r][c] = '.'
                rows[r].remove(move)
                cols[c].remove(move)
                boxes[b].remove(move)

            return False

        find_empties()
        dfs_rec(0)

