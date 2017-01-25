% generate input matrix of size m x n which increments by inc
function in = genI(m,n,inc)
    if(nargin < 3)
        inc = 1;
    end
    in = ones(m,n);
    for i=1:m
        for j=1:n
            in(i,j)=((i-1)*n+j)*inc;
        end
    end
end