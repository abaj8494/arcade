#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

/*-- Constants --*/

/// How many pieces we're trying to connect
#define CONNECT 4

/// The minimum and maximum board dimensions
#define MIN_BOARD_DIMENSION 4
#define MAX_BOARD_WIDTH     9
#define MAX_BOARD_HEIGHT    16

/// The three cell types
#define CELL_EMPTY  '.'
#define CELL_RED    'R'
#define CELL_YELLOW 'Y'

/// The winner conditions
#define WINNER_NONE   0
#define WINNER_RED    1
#define WINNER_YELLOW 2

/// Whose turn is it?
#define TURN_RED    0
#define TURN_YELLOW 1


/*-- Function prototypes --*/

void assert_board_dimension(int dimension, int min, int max);
void initialise_board(void);
void play_game(void);
int  play_turn(int whose_turn);
int  check_winner(void);
int  check_line(int start_row, int start_col, int offset_row, int offset_col);

// provided for you:
bool is_board_full(void);
void print_board(void);


/*-- Global variables --*/

char board[MAX_BOARD_HEIGHT][MAX_BOARD_WIDTH];
int board_width;
int board_height;


/*-- Code --*/

int main(void) {
	printf("Enter board width: ");
	scanf("%d", &board_width);
	assert_board_dimension(board_width, MIN_BOARD_DIMENSION, MAX_BOARD_WIDTH);

	printf("Enter board height: ");
	scanf("%d", &board_height);
	assert_board_dimension(board_height, MIN_BOARD_DIMENSION, MAX_BOARD_HEIGHT);

	initialise_board();
	print_board();
	play_game();

	return 0;
}

/// Make sure the board dimensions we're
/// given fit within the correct bounds
void assert_board_dimension(int dimension, int min, int max) {
	if (dimension < min) {
		printf("Board dimension too small (min %d)\n", min);
		exit(1);
	}

	if (dimension > max) {
		printf("Board dimension too large (max %d)\n", max);
		exit(1);
	}
}

/// Initialise the board to all empty cells
void initialise_board(void) {
	for (int row = 0; row < board_height; row++) {
		for (int col = 0; col < board_width; col++) {
			board[row][col] = CELL_EMPTY;
		}
	}
}

/// The main game loop
void play_game(void) {
	int whose_turn = TURN_RED;
	int winner;

	// Play a single turn
	do {
		whose_turn = play_turn(whose_turn);
		print_board();
		winner = check_winner();
	} while (winner == WINNER_NONE && !is_board_full());

	// Either we have a winner, or the board is full!
	if (winner == WINNER_NONE) {
		printf("The game is a draw!\n");
	} else if (winner == WINNER_RED) {
		printf("Game over, Red wins!\n");
	} else {
		printf("Game over, Yellow wins!\n");
	}
}

/// Play a single turn!
/// This in sequence:
/// - Reads in the column to insert,
/// - Makes sure it is valid,
/// - Inserts the color into that column,
/// - Switches the turn to the next player.
int play_turn(int whose_turn) {
	if (whose_turn == TURN_RED)	printf("[RED] ");
	else                        printf("[YELLOW] ");
	printf("Choose a column: ");

	int target_col = 0;
	scanf("%d", &target_col);
	target_col--; // user input is 1-indexed
	if (target_col < 0 || target_col >= board_width) {
		printf("Invalid column\n");
		return whose_turn;
	}

	int target_row = board_height - 1;
	while (target_row >= 0 && board[target_row][target_col] != CELL_EMPTY) {
		target_row--;

		if (target_row < 0) {
			printf("No space in that column!\n");
			return whose_turn;
		}
	}

	if (whose_turn == TURN_RED) {
		board[target_row][target_col] = CELL_RED;
		return TURN_YELLOW;
	} else {
		board[target_row][target_col] = CELL_YELLOW;
		return TURN_RED;
	}
}

/// Checks if the game has a winner yet!
/// For each position on the board, the
/// loop will check vertical, horizontal,
/// North-East vertical, and
/// North-West vertical for a connection.
int check_winner(void) {
	for (int row = 0; row < board_height; row++) {
		for (int col = 0; col < board_width; col++) {
			int check;

			check = check_line(row, col, 1, 0);
			if (check != WINNER_NONE) return check;

			check = check_line(row, col, 0, 1);
			if (check != WINNER_NONE) return check;

			check = check_line(row, col, 1, 1);
			if (check != WINNER_NONE) return check;

			check = check_line(row, col, 1, -1);
			if (check != WINNER_NONE) return check;
		}
	}

	return WINNER_NONE;
}

/// Checks if a particular line represents
/// a connect 4!
/// It uses a start_row and start_col,
/// and then checks if there are 3 further
/// tokens of the same color, offsetting by
/// offset_row and offset_col each time.
int check_line(int start_row, int start_col, int offset_row, int offset_col) {

	//printf("Debug1: \n%d\n%d\n%d\n%d\n", start_row, start_col, offset_row, offset_col);
	char first_cell = board[start_row][start_col];
	if (first_cell == CELL_EMPTY) return WINNER_NONE;

	int row = start_row + offset_row;
	int col = start_col + offset_col;
	for (int i = 0; i < CONNECT - 1; i++) {
		if (row < 0 || col < 0) return WINNER_NONE;
		if (row >= board_height || col >= board_width) return WINNER_NONE;

		char cell = board[row][col];
		if (cell != first_cell) return WINNER_NONE;

		row += offset_row;
		col += offset_col;
	}

	if (first_cell == CELL_RED) return WINNER_RED;
	else						return WINNER_YELLOW;
}

/// Checks if the board is completely full
/// i.e. there is no free space for a turn.
/// This is the condition that causes a draw
bool is_board_full(void) {
	for (int row = 0; row < board_height; row++) {
		for (int col = 0; col < board_width; col++) {
			if (board[row][col] == CELL_EMPTY) return false;
		}
	}

	return true;
}

/// Print the board out to the terminal,
/// with numbers at the top to indicate
/// the column indicies.
void print_board(void) {
	printf("\n");

	for (int col = 0; col < board_width; col++) {
		printf("%d ", col + 1);
	}

	printf("\n");

	for (int row = 0; row < board_height; row++) {
		for (int col = 0; col < board_width; col++) {
			printf("%c ", board[row][col]);
		}

		printf("\n");
	}
}
