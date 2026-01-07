CC=gcc                                                                               
CFLAGS=-Wall -g
DEPS=                                                                                
OBJ=hashi.o                                                                          
                                                                                      
%.o: %.c $(DEPS)                                                                     
	$(CC) -c -o $@ $< $(CFLAGS)                                                      
                                                                                      
hashi: $(OBJ)                                                                        
	$(CC) -o $@ $^ $(CFLAGS)                                                         
                                                                                      
clean:                                                                               
	rm -f *.o hashi
