% generate input matrix of size m x n which increments by one
function in = genI(m,n)
    in = ones(m,n);
    for i=1:m
        for j=1:n
            in(i,j)=(i-1)*n+j;
        end
    end
end