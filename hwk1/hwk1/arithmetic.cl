

// add
__kernel void Add(__global float* pA, __global float* pB, __global float* pC)
{
    const int x     = get_global_id(0);
    const int y     = get_global_id(1);
    const int width = get_global_size(0);

    const int id = y * width + x;

    pC[id] = pA[id] + pB[id];
}

// SAXPY_1D
__kernel void SAXPY_1D(__global float* pA, __global float* pX, __global float* pY, __global float* pZ)
{
    const int id = get_global_id(0);
    pZ[id] = pA[0]*pX[id] + pY[id];
}

// SAXPY_2D
__kernel void SAXPY_2D(__global float* pA, __global float* pX, __global float* pY, __global float* pZ)
{
    const size_t row     = get_global_id(0);
    const size_t col     = get_global_id(1);

	// Careful! 
	// A is MxM
	// X,Y, and Z are MxN
    const size_t a_width   = get_global_size(0);
	const size_t xyz_width  = get_global_size(1);

	const int xyz_id = row * xyz_width + col;

	pZ[xyz_id] = pY[xyz_id];
	for (size_t inner = 0; inner < a_width; inner++)
	{
		const int innerRowId = row*a_width + inner;
		const int innerColId = inner*xyz_width + col;
		pZ[xyz_id] += pA[innerRowId] * pX[innerColId];
	}
	// printf("running for (%d,%d): %f\n",row,col,pZ[xyz_id]);
}
