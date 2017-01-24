% in: matrix
% out: cumulative sum of in
%
% to save results, use: csvwrite(filename, out)
function [out] = genCumSum(in)
    [m,n] = size(in);
    out = ones(m,n);
    sum = 0;
    for i=1:m
        for j=1:n
            sum = sum + in(i,j);
            out(i,j) = sum;
        end
    end
end