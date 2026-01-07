# init
true  = 1
false = 0
CONNECT = 4
MIN_BOARD_DIMENSION = 4
MAX_BOARD_WIDTH     = 9
MAX_BOARD_HEIGHT    = 16
CELL_EMPTY  = '.'
CELL_RED    = 'R'
CELL_YELLOW = 'Y'
WINNER_NONE   = 0
WINNER_RED    = 1
WINNER_YELLOW = 2
TURN_RED    = 0
TURN_YELLOW = 1

	.data

# char board[MAX_BOARD_HEIGHT][MAX_BOARD_WIDTH];
board:		.space  MAX_BOARD_HEIGHT * MAX_BOARD_WIDTH

board_width:	.word 0

board_height:	.word 0


enter_board_width_str:	.asciiz "Enter board width: "
enter_board_height_str: .asciiz "Enter board height: "
game_over_draw_str:	.asciiz "The game is a draw!\n"
game_over_red_str:	.asciiz "Game over, Red wins!\n"
game_over_yellow_str:	.asciiz "Game over, Yellow wins!\n"
board_too_small_str_1:	.asciiz "Board dimension too small (min "
board_too_small_str_2:	.asciiz ")\n"
board_too_large_str_1:	.asciiz "Board dimension too large (max "
board_too_large_str_2:	.asciiz ")\n"
red_str:		.asciiz "[RED] "
yellow_str:		.asciiz "[YELLOW] "
choose_column_str:	.asciiz "Choose a column: "
invalid_column_str:	.asciiz "Invalid column\n"
no_space_column_str:	.asciiz "No space in that column!\n"
debug:	.asciiz "Debug:\n"

	.text
main:
	# Args:     void
	# Returns:
	#   - $v0: int
	#
	# Frame:    [$ra, ...]
	# Uses:     [...]
	# Clobbers: [...]
	#
	# Locals:
	#   - [...]
	#
	# Structure:
	#   main
	#   -> [prologue]
	#   -> body
	#   -> [epilogue]

main__prologue:
	begin			# begin a new stack frame
	push	$ra		# | $ra

main__body:
	# check valid board dimensions
	
	# print width string
	la		$a0, enter_board_width_str
	li		$v0, 4
	syscall

	# read and store width integer into board_width
	li		$v0, 5	# read integer
	syscall	
	la		$t0, board_width
	sw		$v0, ($t0)
	move	$a0, $v0
	li		$a1, MIN_BOARD_DIMENSION
	li		$a2, MAX_BOARD_WIDTH
	jal		assert_board_dimension

	# print height string
	la		$a0, enter_board_height_str
	li		$v0, 4
	syscall
	
	# read and store height integer into board_height
	li		$v0, 5
	syscall
	la		$t1, board_height
	sw		$v0, ($t1)
	move	$a0, $v0
	li		$a1, MIN_BOARD_DIMENSION
	li		$a2, MAX_BOARD_HEIGHT
	jal		assert_board_dimension

	# initialise board
	jal		initialise_board

	# print board
	jal		print_board
	
	# play game
	jal		play_game


main__epilogue:
	pop	$ra		# | $ra
	end			# ends the current stack frame

	li	$v0, 0
	jr	$ra		# return 0;


########################################################################
# .TEXT <assert_board_dimension>
	.text
assert_board_dimension:
	# Args:
	#   - $a0: int dimension
	#   - $a1: int min
	#   - $a2: int max
	# Returns:  void
	#
	# Frame:    [...]
	# Uses:     [...]
	# Clobbers: [...]
	#
	# Locals:
	#   - [...]
	#
	# Structure:
	#   assert_board_dimension
	#   -> [prologue]
	#   -> body
	#   -> [epilogue]

assert_board_dimension__prologue:
	begin
	push	$ra
assert_board_dimension__body:
	blt		$a0, $a1, assert_board_dimension__small
	bgt		$a0, $a2, assert_board_dimension__large

assert_board_dimension__epilogue:
	pop		$ra
	end
	jr	$ra		# return;

assert_board_dimension__small:
	la		$a0, board_too_small_str_1
	li		$v0, 4
	syscall
	li		$a0, 4
	li		$v0, 1
	syscall
	la		$a0, board_too_small_str_2
	li		$v0, 4
	syscall
	
	# returns with error code 1
	li		$a0, 1
	li		$v0, 17
	syscall


assert_board_dimension__large:
	la		$a0, board_too_large_str_1
	li		$v0, 4
	syscall
	li		$a0, 16
	li		$v0, 1
	syscall
	la		$a0, board_too_large_str_2
	li		$v0, 4
	syscall
	
	# returns with error code 1
	li		$a0, 1
	li		$v0, 17
	syscall
	
	#j		assert_board_dimension__epilogue


########################################################################
# .TEXT <initialise_board>
	.text
initialise_board:
	# Args:     void
	# Returns:  void
	#
	# Frame:    [...]
	# Uses:     [...]
	# Clobbers: [...]
	#
	# Locals:
	#   - [...]
	#
	# Structure:
	#   initialise_board
	#   -> [prologue]
	#   -> body
	#   -> [epilogue]

initialise_board__prologue:
	begin
	push	$ra

initialise_board__body:
	li		$s0, 0		# row
	la		$t0, board
	lw		$t6, board_width
	lw		$t7, board_height
	
initialise_board__row_loop:
	bge		$s0, $t7, initialise_board__row_end
	li		$s1, 0		# col

initialise_board__col_loop:
	bge		$s1, $t6, initialise_board__col_end
	# adding row offset
	mul		$t1, $s0, MAX_BOARD_WIDTH
	
	# adding col offset
	add		$t3, $t1, $s1

	li		$t4, CELL_EMPTY
	sb		$t4, board($t3) 
	
	addi	$s1, $s1, 1
	b		initialise_board__col_loop
	
initialise_board__col_end:
	addi	$s0, $s0, 1
	b		initialise_board__row_loop
	
initialise_board__row_end:
	# clearing variables
	li		$s0, 0
	li		$s1, 0
	

initialise_board__epilogue:
	pop	$ra
	end
	jr	$ra		# return;


########################################################################
# .TEXT <play_game>
	.text
play_game:
	# Args:     void
	# Returns:  void
	#
	# Frame:    [...]
	# Uses:     [...]
	# Clobbers: [...]
	#
	# Locals:
	#   - [...]
	#
	# Structure:
	#   play_game
	#   -> [prologue]
	#   -> body
	#   -> [epilogue]

play_game__prologue:
	begin
	push $ra
play_game__body:
	li		$s4, TURN_RED
	li		$s3, WINNER_NONE
	
play_game__loop:
	bne		$s3, WINNER_NONE, play_game__check
	jal		is_board_full
	beq		$v0, true, play_game__check 
	
	move	$a0, $s4
	jal		play_turn
	
	move	$s4, $v0 
	
	jal		print_board
	
	jal		check_winner
	move	$s3, $v0
	
	b		play_game__loop


play_game__check:
	li		$t0, WINNER_NONE
	li		$t1, WINNER_RED
	li		$t2, WINNER_YELLOW
	beq		$s3, $t0, play_game__draw
	beq		$s3, $t1, play_game__red
	beq		$s3, $t2, play_game__yellow


play_game__draw:
	la		$a0, game_over_draw_str
	li		$v0, 4
	syscall
	
	j		play_game__epilogue


play_game__red:
	la		$a0, game_over_red_str
	li		$v0, 4
	syscall

	j		play_game__epilogue

play_game__yellow:
	la		$a0, game_over_yellow_str
	li		$v0, 4
	syscall

	j		play_game__epilogue

play_game__epilogue:
	pop $ra
	end
	jr	$ra		# return;


########################################################################
# .TEXT <play_turn>
	.text
play_turn:
	# Args:
	#   - $a0: int whose_turn
	# Returns:  void
	#
	# Frame:    [...]
	# Uses:     [...]
	# Clobbers: [...]
	#
	# Locals:
	#   - [...]
	#
	# Structure:
	#   play_turn
	#   -> [prologue]
	#   -> body
	#   -> [epilogue]

play_turn__prologue:
	begin
	push $ra
	lb		$t0, board_width
play_turn__prints:
	move	$s0, $a0
	beq		$s0, TURN_RED, play_turn__print_red
	beq		$s0, TURN_YELLOW, play_turn__print_yellow
	
play_turn__print_red:
	la		$a0, red_str
	li		$v0, 4
	syscall
	
	j		play_turn__body
play_turn__print_yellow:
	la		$a0, yellow_str
	li		$v0, 4
	syscall

	j		play_turn__body
play_turn__body:
	la		$a0, choose_column_str
	li		$v0, 4
	syscall
	
	li		$v0, 5
	syscall
	
	move	$s1, $v0
	sub		$s1, $s1, 1			# user input 1-indexed (column)
	
	blt		$s1, $zero, play_turn__invalid
	bge		$s1, $t0, play_turn__invalid

	lb		$s2, board_height
	sub		$s2, $s2, 1			# row
	
play_turn__loop:
	blt		$s2, 0, play_turn__body_cont
	
	li		$t7, MAX_BOARD_WIDTH
	mul		$t0, $s2, $t7
	add		$t0, $t0, $s1
	lb		$t2, board($t0)
	beq		$t2, 46, play_turn__body_cont
	
	sub		$s2, $s2, 1
	
	blt		$s2, 0, play_turn__full

	b		play_turn__loop

play_turn__body_cont:
	beq		$s0, TURN_RED, play_turn__set_red
	beq		$s0, TURN_YELLOW, play_turn__set_yellow
	
play_turn__set_red:
	mul		$t0, $s2, MAX_BOARD_WIDTH
	add		$t0, $s1
	
	li		$t1, CELL_RED
	sb		$t1, board($t0)
	
	
	li		$s0, TURN_YELLOW
	j		play_turn__epilogue

play_turn__set_yellow:
	mul		$t0, $s2, MAX_BOARD_WIDTH
	add		$t0, $s1
	
	li		$t1, CELL_YELLOW
	sb		$t1, board($t0)

	li		$s0, TURN_RED
	j		play_turn__epilogue

play_turn__invalid:
	la		$a0, invalid_column_str
	li		$v0, 4
	syscall
	
	j		play_turn__epilogue
	
play_turn__full:
	la		$a0, no_space_column_str
	li		$v0, 4
	syscall
	
	j		play_turn__epilogue

play_turn__epilogue:
	la	$v0, ($s0)
	pop	$ra
	end
	jr	$ra		# return;


########################################################################
# .TEXT <check_winner>
	.text
check_winner:
	# Args:	    void
	# Returns:
	#   - $v0: int
	#
	# Frame:    [...]
	# Uses:     [...]
	# Clobbers: [...]
	#
	# Locals:
	#   - [...]
	#
	# Structure:
	#   check_winner
	#   -> [prologue]
	#   -> body
	#   -> [epilogue]

check_winner__prologue:
	begin
	push $ra

check_winner__body:
	li		$s0, 0		# row
	lw		$t6, board_width
	lw		$t7, board_height

check_winner__row_loop:
	bge		$s0, $t7, check_winner__row_end
	li		$s1, 0		# col
	
check_winner__col_loop:
	bge		$s1, $t6, check_winner__col_end
	
	# computing row offset
	mul		$t2, $s0, MAX_BOARD_WIDTH
	# computing col offset
	add		$t2, $s1
	
	## check vertical line
	move	$a0, $s0
	move	$a1, $s1
	li		$a2, 1
	li		$a3, 0
	
	jal		check_line
	bne		$v0, WINNER_NONE, check_winner__epilogue
	
	# check horizontal line
	move	$a0, $s0
	move	$a1, $s1
	li		$a2, 0
	li		$a3, 1
	
	jal		check_line
	bne		$v0, WINNER_NONE, check_winner__epilogue

	# check gradient = -1 line
	move	$a0, $s0
	move	$a1, $s1
	li		$a2, 1
	li		$a3, 1
	
	jal		check_line
	bne		$v0, WINNER_NONE, check_winner__epilogue
	
	# check gradient = 1 line
	move	$a0, $s0
	move	$a1, $s1
	li		$a2, 1
	li		$a3, -1
	
	jal		check_line
	bne		$v0, WINNER_NONE, check_winner__epilogue
	
	addiu	$s1, 1
	j		check_winner__col_loop
	
check_winner__col_end:
	addiu	$s0, 1
	j		check_winner__row_loop
	
check_winner__row_end:

check_winner__epilogue:
	pop $ra
	end
	jr	$ra		# return;


########################################################################
# .TEXT <check_line>
	.text
check_line:
	# Args:
	#   - $a0: int start_row
	#   - $a1: int start_col
	#   - $a2: int offset_row
	#   - $a3: int offset_col
	# Returns:
	#   - $v0: int
	#
	# Frame:    [...]
	# Uses:     [...]
	# Clobbers: [...]
	#
	# Locals:
	#   - [...]
	#
	# Structure:
	#   check_line
	#   -> [prologue]
	#   -> body
	#   -> [epilogue]

check_line__prologue:
	begin
	push	$ra

	lw		$s2, board_height
	lw		$s5, board_width

	# calculating offset
	mul		$t0, $a0, MAX_BOARD_WIDTH
	add		$t0, $t0, $a1		# first_cell
	
	lb		$t1, board($t0)
	beq		$t1, CELL_EMPTY, check_line__winner_none
	
	add		$t2, $a0, $a2		# row
	add		$t3, $a1, $a3		# col

	# how many connects required
	li		$t5, CONNECT
	sub		$t5, $t5, 1
	
	# i for loop
	li		$t4, 0
	
	# clearing t7 register
	li		$t8, 0

check_line__body:
	bge		$t4, $t5, check_line__body_cont
	
	blt		$t2, $zero, check_line__winner_none
	blt		$t3, $zero, check_line__winner_none
	
	bge		$t2, $s2, check_line__winner_none
	bge		$t3, $s5, check_line__winner_none
	
	mul		$t8, $t2, MAX_BOARD_WIDTH
	add		$t8, $t8, $t3		# board[row][col]

	lb		$t9, board($t8)
	bne		$t1, $t9, check_line__winner_none

	add		$t2, $t2, $a2
	add		$t3, $t3, $a3
	
	addiu	$t4, 1
	b		check_line__body		
	

check_line__winner_none:
	li		$v0, WINNER_NONE
	j		check_line__epilogue

check_line__winner_red:
	li		$v0, WINNER_RED
	j		check_line__epilogue

check_line__winner_yellow:
	li		$v0, WINNER_YELLOW
	j		check_line__epilogue
	
check_line__body_cont:
	beq		$t1, CELL_RED, check_line__winner_red
	beq		$t1, CELL_YELLOW, check_line__winner_yellow

check_line__epilogue:
	pop	$ra
	end
	jr	$ra		# return;




########################################################################
# .TEXT <is_board_full>
# YOU DO NOT NEED TO CHANGE THE IS_BOARD_FULL FUNCTION
	.text
is_board_full:
	# Args:     void
	# Returns:
	#   - $v0: bool
	#
	# Frame:    []
	# Uses:     [$v0, $t0, $t1, $t2, $t3]
	# Clobbers: [$v0, $t0, $t1, $t2, $t3]
	#
	# Locals:
	#   - $t0: int row
	#   - $t1: int col
	#
	# Structure:
	#   is_board_full
	#   -> [prologue]
	#   -> body
	#   -> loop_row_init
	#   -> loop_row_cond
	#   -> loop_row_body
	#     -> loop_col_init
	#     -> loop_col_cond
	#     -> loop_col_body
	#     -> loop_col_step
	#     -> loop_col_end
	#   -> loop_row_step
	#   -> loop_row_end
	#   -> [epilogue]

is_board_full__prologue:
is_board_full__body:
	li	$v0, true

is_board_full__loop_row_init:
	li	$t0, 0						# int row = 0;

is_board_full__loop_row_cond:
	lw	$t2, board_height
	bge	$t0, $t2, is_board_full__epilogue		# if (row >= board_height) goto is_board_full__loop_row_end;

is_board_full__loop_row_body:
is_board_full__loop_col_init:
	li	$t1, 0						# int col = 0;

is_board_full__loop_col_cond:
	lw	$t2, board_width
	bge	$t1, $t2, is_board_full__loop_col_end		# if (col >= board_width) goto is_board_full__loop_col_end;

is_board_full__loop_col_body:
	mul	$t2, $t0, MAX_BOARD_WIDTH			# row * MAX_BOARD_WIDTH
	add	$t2, $t2, $t1					# row * MAX_BOARD_WIDTH + col
	lb	$t3, board($t2)					# board[row][col];
	bne	$t3, CELL_EMPTY, is_board_full__loop_col_step	# if (cell != CELL_EMPTY) goto is_board_full__loop_col_step;

	li	$v0, false
	b	is_board_full__epilogue				# return false;

is_board_full__loop_col_step:
	addi	$t1, $t1, 1					# col++;
	b	is_board_full__loop_col_cond			# goto is_board_full__loop_col_cond;

is_board_full__loop_col_end:
is_board_full__loop_row_step:
	addi	$t0, $t0, 1					# row++;
	b	is_board_full__loop_row_cond			# goto is_board_full__loop_row_cond;

is_board_full__loop_row_end:
is_board_full__epilogue:
	jr	$ra						# return;


########################################################################
# .TEXT <print_board>
# YOU DO NOT NEED TO CHANGE THE PRINT_BOARD FUNCTION
	.text
print_board:
	# Args:     void
	# Returns:  void
	#
	# Frame:    []
	# Uses:     [$v0, $a0, $t0, $t1, $t2]
	# Clobbers: [$v0, $a0, $t0, $t1, $t2]
	#
	# Locals:
	#   - `int col` in $t0
	#   - `int row` in $t0
	#   - `int col` in $t1
	#
	# Structure:
	#   print_board
	#   -> [prologue]
	#   -> body
	#   -> for_header_init
	#   -> for_header_cond
	#   -> for_header_body
	#   -> for_header_step
	#   -> for_header_post
	#   -> for_row_init
	#   -> for_row_cond
	#   -> for_row_body
	#     -> for_col_init
	#     -> for_col_cond
	#     -> for_col_body
	#     -> for_col_step
	#     -> for_col_post
	#   -> for_row_step
	#   -> for_row_post
	#   -> [epilogue]

print_board__prologue:
print_board__body:
	li	$v0, 11			# syscall 11: print_int
	la	$a0, '\n'
	syscall				# printf("\n");

print_board__for_header_init:
	li	$t0, 0			# int col = 0;

print_board__for_header_cond:
	lw	$t1, board_width
	blt	$t0, $t1, print_board__for_header_body	# col < board_width;
	b	print_board__for_header_post

print_board__for_header_body:
	li	$v0, 1			# syscall 1: print_int
	addiu	$a0, $t0, 1		#              col + 1
	syscall				# printf("%d", col + 1);

	li	$v0, 11			# syscall 11: print_character
	li	$a0, ' '
	syscall				# printf(" ");

print_board__for_header_step:
	addiu	$t0, 1			# col++
	b	print_board__for_header_cond

print_board__for_header_post:
	li	$v0, 11
	la	$a0, '\n'
	syscall				# printf("\n");

print_board__for_row_init:
	li	$t0, 0			# int row = 0;

print_board__for_row_cond:
	lw	$t1, board_height
	blt	$t0, $t1, print_board__for_row_body	# row < board_height
	b	print_board__for_row_post

print_board__for_row_body:
print_board__for_col_init:
	li	$t1, 0			# int col = 0;

print_board__for_col_cond:
	lw	$t2, board_width
	blt	$t1, $t2, print_board__for_col_body	# col < board_width
	b	print_board__for_col_post

print_board__for_col_body:
	mul	$t2, $t0, MAX_BOARD_WIDTH
	add	$t2, $t1
	
	## debug
	#la	$a0, ($t2)
	#li	$v0, 1
	#syscall
	## debug

	lb	$a0, board($t2)		# board[row][col]

	li	$v0, 11			# syscall 11: print_character
	syscall				# printf("%c", board[row][col]);
	
	li	$v0, 11			# syscall 11: print_character
	li	$a0, ' '
	syscall				# printf(" ");

print_board__for_col_step:
	addiu	$t1, 1			# col++;
	b	print_board__for_col_cond

print_board__for_col_post:
	li	$v0, 11			# syscall 11: print_character
	li	$a0, '\n'
	syscall				# printf("\n");

print_board__for_row_step:
	addiu	$t0, 1
	b	print_board__for_row_cond

print_board__for_row_post:
print_board__epilogue:
	jr	$ra			# return;

