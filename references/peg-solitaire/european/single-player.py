#import numpy as np
from os import system

P = 99 # player is 99
N = 7 # board width

board = [[ 0,  0,  1,  2,  3,  0,  0],
         [ 0,  4,  5,  6,  7,  8,  0],
         [ 9, 10, 11, 12, 13, 14, 15],
         [16, 17, 18, 36, 19, 20, 21],
         [22, 23, 24, 25, 26, 27, 28],
         [ 0, 29, 30, 31, 32, 33,  0],
         [ 0,  0, 34, 35, -1,  0,  0]]

empties = []
jumplist = []
valids = 0

class Player:
    def __init__(self):
        self.position = [6, 4]
        self.moves = []

    def move(self, m):
        match m:
            case "w":
                if (self.position[0] > 0 
                        and board[self.position[0]-1][self.position[1]] != 0):
                    self.position[0] -= 1
            case "a":
                if (self.position[1] > 0
                        and board[self.position[0]][self.position[1]-1] != 0):
                    self.position[1] -= 1
            case "s":
                if (self.position[0] < N-1
                        and board[self.position[0]+1][self.position[1]] != 0):
                    self.position[0] += 1
            case "d":
                if (self.position[1] < N-1
                        and board[self.position[0]][self.position[1]+1] != 0):
                    self.position[1] += 1
            case " ":
                self.jump(input("jump where? "))

    def jump(self, j):
        match j:
            case "w":
                if (self.position[0] > 1 
                        and board[self.position[0]-1][self.position[1]] > 0
                        and board[self.position[0]-2][self.position[1]] < 0):
                    empties.append(board[self.position[0]-1][self.position[1]])
                    empties.append(board[self.position[0]][self.position[1]])
                    jumplist.append([board[self.position[0]][self.position[1]], "w"])
                    board[self.position[0]-1][self.position[1]] = -1
                    board[self.position[0]-2][self.position[1]] = board[self.position[0]][self.position[1]]
                    board[self.position[0]][self.position[1]] = -1
                    self.position[0] -= 2
            case "a":
                if (self.position[1] > 1
                        and board[self.position[0]][self.position[1]-2] < 0
                        and board[self.position[0]][self.position[1]-1] > 0):
                    empties.append(board[self.position[0]][self.position[1]-1])
                    empties.append(board[self.position[0]][self.position[1]])
                    jumplist.append([board[self.position[0]][self.position[1]], "a"])
                    board[self.position[0]][self.position[1]-1] = -1
                    board[self.position[0]][self.position[1]-2] = board[self.position[0]][self.position[1]]
                    board[self.position[0]][self.position[1]] = -1
                    self.position[1] -= 2
            case "s":
                if (self.position[0] < N-2
                        and board[self.position[0]+2][self.position[1]] < 0
                        and board[self.position[0]+1][self.position[1]] > 0):
                    empties.append(board[self.position[0]+1][self.position[1]])
                    empties.append(board[self.position[0]][self.position[1]])
                    jumplist.append([board[self.position[0]][self.position[1]], "s"])
                    board[self.position[0]+1][self.position[1]] = -1
                    board[self.position[0]+2][self.position[1]] = board[self.position[0]][self.position[1]]
                    board[self.position[0]][self.position[1]] = -1
                    self.position[0] += 2
            case "d":
                if (self.position[1] < N-2
                        and board[self.position[0]][self.position[1]+2] < 0
                        and board[self.position[0]][self.position[1]+1] > 0):
                    empties.append(board[self.position[0]][self.position[1]+1])
                    empties.append(board[self.position[0]][self.position[1]])
                    jumplist.append([board[self.position[0]][self.position[1]], "d"])
                    board[self.position[0]][self.position[1]+1] = -1
                    board[self.position[0]][self.position[1]+2] = board[self.position[0]][self.position[1]]
                    board[self.position[0]][self.position[1]] = -1
                    self.position[1] += 2


def print_board(player):
    for i, row, in enumerate(board):
        for col in range(len(row)):
            if ([i,col] == player.position):
                print('X', end='')
            elif (row[col] > 0):
                print('.', end='')
            elif (row[col] == 0):
                print(' ', end='')
            elif (row[col] < 0):
                print('O', end='')
        print('\n')
    print("empties: ", empties)
    print("jumplist: ", jumplist)
    print("valids: ", valids)

def check_loss():
    global valids
    valids = 0
    for i, row in enumerate(board):
        for col in range(len(row)):
            if ((i > 1 and board[i-2][col] < 0 and board[i-1][col] > 0) or 
                (col > 1 and board[i][col-2] < 0 and board[i][col-1] > 0) or 
                (i < N-2 and board[i+2][col] < 0 and board[i+1][col] > 0) or
                    (col < N-2 and board[i][col+2] < 0 and board[i][col+1] > 0)):
                if (board[i][col] > 0):
                    valids += 1
    if (valids == 0):
        game_over(0)


def check_win():
    pegs = 0
    for i, row in enumerate(board):
        for col in range(len(row)):
            if (board[i][col] > 0):
                pegs+= 1
        if (pegs > 1):
            return
    if (pegs == 1):
        game_over(1)


def game():
    player = Player()
    print_board(player)
    print(player.position)
    while True:
        inp = input("move: ")
        if (inp == "q"):
            break
        player.move(inp)
        check_win()
        check_loss()
        system('clear')
        print_board(player)

def game_over(status):
    if (status == 1):
        print("GAME OVER: YOU WON!")
    else:
        print("GAME OVER: YOU LOST!")
    exit()
    

if __name__ == "__main__":
    game()
