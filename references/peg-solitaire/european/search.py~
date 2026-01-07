from collections import deque
from copy import deepcopy
import resource

N = 7

memory_limit = 30 * 1024 * 1024 * 1024
resource.setrlimit(resource.RLIMIT_AS, (memory_limit, memory_limit))
class PegSolitaire:
    def __init__(self, board, moves, lvl, idx):
        self.board = board
        self.moves = moves
        self.lvl = lvl
        self.idx = idx

    def is_solved(self):
        board = self.board
        pegs = 0
        position = []
        for i, row in enumerate(board):
            for col in range(len(row)):
                if (board[i][col] > 0):
                    position.append([i, col])
                    pegs+= 1
            if (pegs > 1):
                return False
        #if (pegs == 1 and position == [[3,3]]):
        if (pegs == 1):
            return True


    def get_valid_moves(self):
        valids = []
        board = self.board
        for i, row in enumerate(board):
            for col in range(len(row)):
                if (board[i][col] > 0):
                    if (i > 1 and board[i-2][col] < 0 and board[i-1][col] > 0):
                        valids.append([i,col,"w",board[i-1][col]])
                    if (col > 1 and board[i][col-2] < 0 and board[i][col-1] > 0): 
                        valids.append([i,col,"a",board[i][col-1]])
                    if (i < N-2 and board[i+2][col] < 0 and board[i+1][col] > 0):
                        valids.append([i,col,"s",board[i+1][col]])
                    if (col < N-2 and board[i][col+2] < 0 and board[i][col+1] > 0):
                        valids.append([i,col,"d",board[i][col+1]])
        #print("VALID MOVES:", valids)
        #print("MOVES thus far:", self.moves)
        return valids

    def make_move(self, move):
        self.moves.append(move)
        board = self.board
        match move[2]:
            case "w":
                board[move[0]-1][move[1]] = -1
                board[move[0]-2][move[1]] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                move[0] -= 2
            case "a":
                board[move[0]][move[1]-1] = -1
                board[move[0]][move[1]-2] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                move[1] -= 2
            case "s":
                board[move[0]+1][move[1]] = -1
                board[move[0]+2][move[1]] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                move[0] += 2
            case "d":
                board[move[0]][move[1]+1] = -1
                board[move[0]][move[1]+2] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                move[1] += 2
    
    def undo_move(self):
        move = self.moves.pop()
        board = self.board
        #print("POPPED:", move)
        match move[2]:
            case "w":
                board[move[0]+2][move[1]] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                board[move[0]+1][move[1]] = move[3]
            case "a":
                board[move[0]][move[1]+2] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                board[move[0]][move[1]+1] = move[3]
            case "s":
                board[move[0]-2][move[1]] = board[move[0]][move[1]]
                board[move[0]][move[1]] = -1
                board[move[0]-1][move[1]] = move[3]
            case "d":
                board[move[0]][move[1]-2] = board[move[0]][move[1]] 
                board[move[0]][move[1]] = -1
                board[move[0]][move[1]-1] = move[3]

    def iterative_deepening_dfs(self, max_depth):
        for depth in range(max_depth + 1):
            print(f"Searching with depth limit: {depth}")
            self.visited_count = 0
            if self.depth_limited_dfs(depth):
                print("Solution found!")
                return True
            print(f"Searched {self.visited_count} boards")
        print("No solution found within max depth.")
        return False

    def depth_limited_dfs(self, limit):
        # Helper function to perform DFS with a depth limit
        return self.dfs_recursive(limit, 0)

    def dfs_recursive(self, limit, current_depth):
        # Base case: if solved, return True
        self.visited_count += 1
        if self.is_solved():
            return True
        # Return False if we've hit the current depth limit
        if current_depth == limit:
            return False

        for move in self.get_valid_moves():
            #self.print_board()
            self.make_move(move)
            if self.dfs_recursive(limit, current_depth + 1):
                return True
            self.undo_move()  # Backtrack if not solved at this depth
        return False

    def dfs_arch(self):
        if self.is_solved():
            return True

        for move in self.get_valid_moves():
            self.print_board()
            self.make_move(move)
            if self.dfs_arch():
                return True
            self.undo_move()
        return False

    def encode_board(self):
        # Converts the board into a single integer, assuming a flat list of cells
        return int("".join("1" if cell > 0 else "0" for row in self.board for cell in row), 2)

    def dfs(self, visited=None):
        if visited is None:
            visited = set()  # Initialize the visited set on the first call

        # Encode the board state as a single integer
        board_state = self.encode_board()

        # Check if this encoded board state has already been visited
        if board_state in visited:
            return False

        # Mark the board as visited
        visited.add(board_state)

        # Base case: Check if solved
        if self.is_solved():
            return True

        # Explore each valid move
        for move in self.get_valid_moves():
            #self.print_board()
            self.make_move(move)
            if self.dfs(visited):  # Pass visited set to recursive calls
                return True
            self.undo_move()  # Backtrack if not solved at this depth

        # Optional: Uncomment if you want to remove the state after backtracking
        # visited.remove(board_state)

        return False

    def bfs(self):
        lvl = 0
        idx = 0
        last_lvl = lvl
        queue = deque()
        queue.append(self)
        visited = set()
        visited.add(tuple(map(tuple, self.board)))

        while queue:
            curr_board = queue.popleft()
            lvl = curr_board.lvl + 1 
            if last_lvl < lvl:
                with open("results.txt", "a") as f:
                    f.write(f"lvl {last_lvl} finished with {idx} nodes\n")
                idx = 0
                last_lvl = lvl
            print("CHECKING VALID MOVES FOR THIS BOARD:")
            curr_board.print_board()
            print("LOCATION IN TREE:")
            curr_board.print_loc()
            if curr_board.is_solved():
                self.moves = curr_board.moves
                print("SOLVED!")
                return

            print("VALID MOVES: {}\nTOTAL: {}".format(curr_board.get_valid_moves(),len(curr_board.get_valid_moves())))
            for move in curr_board.get_valid_moves():
                #print("FOUND: {}".format(curr_board.get_valid_moves()))
                neighbour_board = PegSolitaire(deepcopy(curr_board.board), deepcopy(curr_board.moves), lvl, idx)
                neighbour_board.make_move(move)
                idx += 1
                #print("MADE THIS MOVE: {} such that the board looks like:".format(move))
                #neighbour_board.print_board()
                ##board_str = str(neighbour_board.board)
                board_tuple = tuple(map(tuple, neighbour_board.board))
                #print("MY BOARD STR IS {}".format(board_str))
                if board_tuple not in visited:
                    #print("IT WAS UNIQUE!")
                    visited.add(board_tuple)
                    queue.append(neighbour_board)

    def print_moves(self):
        print(self.moves)
        print(len(self.moves))

    def print_loc(self):
        print("I am at LVL: %2d, and IDX: %2d" % (self.lvl, self.idx))
            
    def print_board(self):
        board = self.board
        for row in board:
            for col in range(len(row)):
                if (row[col] > 0):
                    print('.', end='')
                elif (row[col] == 0):
                    print(' ', end='')
                elif (row[col] < 0):
                    print('O', end='')
            print('\n')

if __name__ == "__main__":
    board = [[ 0,  0,  1,  2,  3,  0,  0],
             [ 0,  4,  5,  6,  7,  8,  0],
             [ 9, 10, 11, 12, 13, 14, 15],
             [16, 17, 18, 36, 19, 20, 21],
             [22, 23, 24, 25, 26, 27, 28],
             [ 0, 29, 30, 31, 32, 33,  0],
             [ 0,  0, 34, 35, -1,  0,  0]]
    game = PegSolitaire(board, [], 0, 0)
    game.dfs()
    #game.iterative_deepening_dfs(36)
    #game.iterative_deepening_bfs(35)
    game.print_moves()

