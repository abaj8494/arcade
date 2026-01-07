#include <iostream>
#include <set>
#include <stack>

typedef std::pair<int, int> location_t;
typedef std::pair<location_t, location_t> jump_t;

bool peg_solitaire_solve( bool array[7][7], int remaining, bool reset = true );
bool solution_found( bool array[7][7] );
bool is_valid( int i, int j );
void init( bool array[7][7] );
int peg_count( bool array[7][7] );
void print_board( bool array[7][7] );
unsigned long int id_board( bool array[7][7] );
void print_jump( jump_t jump );

#define ENGLISH

#define FIRST_I 3
#define FIRST_J 3

#ifdef ENGLISH
	/* English variant
	 *
	 *     0 1 2 3 4 5 6
	 *
	 *  0      o o o
	 *  1      o o o
	 *  2  o o o o o o o
	 *  3  o o o x o o o
	 *  4  o o o o o o o
	 *  5      o o o
	 *  6      o o o
	 */

	#define POINTS 33

	// An array of the coordinates of valid locations

	int points[POINTS][2] = {
		                {0, 2}, {0, 3}, {0, 4},
		                {1, 2}, {1, 3}, {1, 4},
		{2, 0}, {2, 1}, {2, 2}, {2, 3}, {2, 4}, {2, 5}, {2, 6},
		{3, 0}, {3, 1}, {3, 2}, {3, 3}, {3, 4}, {3, 5}, {3, 6},
		{4, 0}, {4, 1}, {4, 2}, {4, 3}, {4, 4}, {4, 5}, {4, 6},
		                {5, 2}, {5, 3}, {5, 4},
		                {6, 2}, {6, 3}, {6, 4}
	};

	#define LAST_I 3
	#define LAST_J 3
#else
	/*  European variant
	 *
	 *     0 1 2 3 4 5 6
	 *
	 *  0      o o o
	 *  1    o o o o o
	 *  2  o o o x o o o
	 *  3  o o o o o o o
	 *  4  o o o o o o o
	 *  5    o o o o o
	 *  6      o o o
	 */

	#define POINTS 37

	// An array of the coordinates of valid locations

	int points[POINTS][2] = {
		                {0, 2}, {0, 3}, {0, 4},
		        {1, 1}, {1, 2}, {1, 3}, {1, 4}, {1, 5},
		{2, 0}, {2, 1}, {2, 2}, {2, 3}, {2, 4}, {2, 5}, {2, 6},
		{3, 0}, {3, 1}, {3, 2}, {3, 3}, {3, 4}, {3, 5}, {3, 6},
		{4, 0}, {4, 1}, {4, 2}, {4, 3}, {4, 4}, {4, 5}, {4, 6},
		        {5, 1}, {5, 2}, {5, 3}, {5, 4}, {5, 5},
		                {6, 2}, {6, 3}, {6, 4}
	};

	#define LAST_I 2
	#define LAST_J 3
#endif

int main() {
	bool array[7][7];

	init( array );

	print_board( array );

	peg_solitaire_solve( array, POINTS - 1 );

	print_board( array );

	return 0;
}

bool peg_solitaire_solve( bool array[7][7], int remaining, bool reset ) {
	static std::set<unsigned long int> visited;
	static std::stack<jump_t> solution_trace;

	int moves[4][2] = {{0, 1}, {0, -1}, {1, 0}, {-1, 0}};

	if ( reset ) {
		visited.clear();
	}

	if ( remaining == 1 ) {
		return solution_found( array );
	}

	unsigned long int id = id_board( array );

	// If we have already visited this board or one symmetric to it,
	//    there is no point in going on,
	if ( visited.count( id ) > 0 ) {
		return false;
	}

	for ( int pt = 0; pt < POINTS; ++pt ) {
		int const i = points[pt][0];
		int const j = points[pt][1];

		// If the point is within the boundaries and it is a hole...

		if ( !array[i][j] ) {
			// ...try all possible moves
			for ( int k = 0; k < 4; ++k ) {
				int const p = i + moves[k][0];
				int const q = j + moves[k][1];

				int const m = p + moves[k][0];
				int const n = q + moves[k][1];

				if ( is_valid( m, n ) && is_valid( p, q ) && array[m][n] && array[p][q] ) {
					// Arrange the board as if we made the jump
					array[m][n] = false;
					array[p][q] = false;
					array[i][j] = true;

					// If we solved the puzzle, print out the moves
					if ( peg_solitaire_solve( array, remaining - 1, false ) ) {
						static int count = POINTS - 2;

						solution_trace.push( jump_t(
							location_t(m, n), location_t(i, j)
						) );

						--count;

						if ( count == 0 ) {
							std::cout << "Solution:" << std::endl;

							for ( int i = 1; i <= (POINTS - 2); ++i ) {
								std::cout << " " << i << ".\t";
								print_jump( solution_trace.top() );
								std::cout << std::endl;

								solution_trace.pop();
							}
						}


						return true;
					} else {
						// ... otherwise, reset the board to the previous state.
						array[m][n] = true;
						array[p][q] = true;
						array[i][j] = false;
					}
				}
			}
		}
	}

	// Flag that we have already visited this board and
	// that it did not lead to a solution
	visited.insert( id );

	return false;
}

/*
 * The board is represented by the dihedral group D 
 *                                                 4
 *
 * This includes eight symetries, with four rotations and one reflection
 *     A B   C A   D C   B D   B A   A C   C D   D B
 *     C D   D B   B A   A C   D C   B D   A B   C A
 *
 * The locations containing pegs will represent a '1' in a 32-bit integer, '0' otherwise
 *
 * Thus,
 *
 *   0 0 1 0 1 0 0
 *   0 0 1 1 0 0 0
 *   1 1 1 1 0 0 1
 *   1 0 1 1 1 1 1
 *   0 0 1 1 1 0 1
 *   0 0 1 1 1 0 0
 *   0 0 1 1 1 0 0
 *
 * may be represented by
 *     0011100001110010111001111101100111100011000010100
 *     0011100000100011110011111110111111100001000001100
 *     0011100001110000111011011111111100100110000010100
 *     0001100000010011111111111110111100100010000011100
 *     0010100001100011110011011111001110100111000011100
 *     0011000001000011111110111111100111100010000011100
 *     0010100000110010011111111101101110000111000011100
 *     0011100000100010011110111111111111100100000011000
 *
 * The smallest of these, namely
 *     0001100000010011111111111110111100100010000011100
 * represents all eight.
 *
 * This works for both English and European variants
 */

unsigned long int id_board( bool array[7][7] ) {
	unsigned long int symmetry[8] = {0, 0, 0, 0, 0, 0, 0, 0};
	unsigned long int mask = 1;

	for ( int i0 = 0; i0 <= 6; ++i0 ) {
		for ( int j0 = 0; j0 <= 6; ++j0 ) {
			int i1 = 6 - i0;
			int j1 = 6 - j0;

			if ( array[i0][j0] ) symmetry[0] |= mask;
			if ( array[i1][j0] ) symmetry[1] |= mask;
			if ( array[i1][j1] ) symmetry[2] |= mask;
			if ( array[i0][j1] ) symmetry[3] |= mask;
			if ( array[j0][i0] ) symmetry[4] |= mask;
			if ( array[j1][i0] ) symmetry[5] |= mask;
			if ( array[j1][i1] ) symmetry[6] |= mask;
			if ( array[j0][i1] ) symmetry[7] |= mask;

			mask <<= 1;
		}
	}

	unsigned long int representative = symmetry[0];

	// In this case, having a unique representative for eight congruent boards
	// is no actually necessary.  The order in which the problem is tackled avoids
	// running into congruent boards, so it is actually much faster to simply have
	// a single representative.
	//
	// Compare without eliminating congruences
	//    11.191u 0.092s 0:11.28 100.0%   0+0k 0+0io 0pf+0w
	// versus
	//    17.906u 0.076s 0:17.98 99.9%    0+0k 0+0io 0pf+0w
	// return representative;

	for ( int i = 1; i < 8; ++i ) {
		if ( symmetry[i] < symmetry[0] ) {
			representative = symmetry[i];
		}
	}

	return representative;
}

/*
 * Print out the board with 'x' for pegs and 'o' for holes.
 *
 *      ---------------
 *     |     x x x     |
 *     |     x x x     |
 *     | x x x x x x x |
 *     | x x x o x x x |
 *     | x x x x x x x |
 *     |     x x x     |
 *     |     x x x     |
 *      ---------------
 */

void print_board( bool array[7][7] ) {
	std::cout << " ---------------" << std::endl;

	for ( int i = 0; i <= 6; ++i ) {
		std::cout << "| ";

		for ( int j = 0; j <= 6; ++j ) {
			if ( array[i][j] ) {
				std::cout << "x ";
			} else if ( is_valid( i, j ) ) {
				std::cout << "o ";
			} else {
				std::cout << "  ";
			}
		}

		std::cout << "|" << std::endl;
	}

	std::cout << " ---------------" << std::endl;
}

/*
 * Count the number of pegs remaining in the board
 */

int peg_count( bool array[7][7] ) {
	int c = 0;

	for ( int i = 0; i < POINTS; ++i ) {
		if ( array[points[i][0]][points[i][1]] ) {
			++c;
		}
	}

	return c;
}

/*
 * Initialize the board.
 */

void init( bool array[7][7] ) {
	for ( int i = 0; i <= 6; ++i ) {
		for ( int j = 0; j <= 6; ++j ) {
			array[i][j] = false;
		}
	}

	for ( int i = 0; i < POINTS; ++i ) {
		array[points[i][0]][points[i][1]] = true;
	}

	array[FIRST_I][FIRST_J] = false;
}

/*
 * Determine if a solution is found;
 *   that is, every hole is empty except for the last hole.
 */

bool solution_found( bool array[7][7] ) {
	// If the last hole is empty, we cannot be finished
	return array[LAST_I][LAST_J];
}

/*
 * Check if a point is a valid location within the board
 */

bool is_valid( int i, int j ) {
	return (i >= 0 && i <= 6) && (j >= 0 && j <= 6) && (
		(i >= 2 && i <= 4) || (j >= 2 && j <= 4)
#ifndef ENGLISH
		|| ((i >= 1 && i <= 5) && (j >= 1 && j <= 5))
#endif
	);
}

void print_jump( jump_t jump ) {
	std::cout << "Jump from ("
	          << jump.first.first << ","
	          << jump.first.second << ") to ("
	          << jump.second.first << ","
	          << jump.second.second << ")";
}
