EMPTY = -1
PEG = 1
VOID = 0
N = 7

class PegSolitaire:
    def __init__(self, board):
        self.board = board
        self.moves = []

    def is_solved(self):
        pegs = 0
        position = []
        for i, row in enumerate(board):
            for col in range(len(row)):
                if (board[i][col] > 0):
                    position.append([i, col])
                    pegs+= 1
            if (pegs > 1):
                return False
        if (pegs == 1 and position == [[3,3]]):
            return True

    def get_valid_moves(self):
        valids = []
        for i, row in enumerate(board):
            for col in range(len(row)):
                if (board[i][col] > 0):
                    if (i > 1 and board[i-2][col] < 0 and board[i-1][col] > 0):
                        valids.append([i,col,"w",board[i-1][col]])
                    elif (col > 1 and board[i][col-2] < 0 and board[i][col-1] > 0): 
                        valids.append([i,col,"a",board[i][col-1]])
                    elif (i < N-2 and board[i+2][col] < 0 and board[i+1][col] > 0):
                        valids.append([i,col,"s",board[i+1][col]])
                    elif (col < N-2 and board[i][col+2] < 0 and board[i][col+1] > 0):
                        valids.append([i,col,"d",board[i][col+1]])
        print("VALID MOVES:", valids)
        print("MOVES thus far:", self.moves)
        return valids

    def make_move(self, move):
        self.moves.append(move)
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
        print("POPPED:", move)
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

    # def solve(self):
    #     if self.is_solved():
    #         return True
    #     for move in self.get_valid_moves():
    #         self.print_board()
    #         self.make_move(move)
    #         if self.solve():
    #             return True
    #         self.undo_move()
    #     return False

    def print_moves(self):
        print(self.moves)
        print(len(self.moves))
            
    def print_board(self):
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
             [ 0,  0,  4,  5,  6,  0,  0],
             [ 7,  8,  9, 10, 11, 12, 13],
             [14, 15, 16, -1, 17, 18, 19],
             [20, 21, 22, 23, 24, 25, 26],
             [ 0,  0, 27, 28, 29,  0,  0],
             [ 0,  0, 30, 31, 32,  0,  0]]
    game = PegSolitaire(board)
    game.dfs()
    game.print_moves()

