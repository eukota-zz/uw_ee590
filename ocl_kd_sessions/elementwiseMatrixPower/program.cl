
__kernel void elementwiseMatrixPower(__global float* pA, unsigned int K, __global float* pB)
{
    const int x     = get_global_id(0);
    const int y     = get_global_id(1);
    const int width = get_global_size(0);

    const int id = y * width + x;
	float input = pA[id];
	float output = pow(input, K);
	pB[id] = output;
}
