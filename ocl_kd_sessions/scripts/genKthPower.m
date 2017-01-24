% in: matrix
% K: power to raise each value to
% out: each cell raised to the power of K
%
% to save results, use: csvwrite(filename, out)
function [out] = genKthPower(in,K)
    out = in.^K;
end