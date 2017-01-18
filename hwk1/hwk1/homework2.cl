
__kernel void DotProduct_Manual(__global float4* pA, __global float4* pB, __global float* pC)
{ 
	int idx = get_global_id(0);

	pC[idx] = pA[idx].x*pB[idx].x + pA[idx].y*pB[idx].y + pA[idx].z*pB[idx].z + pA[idx].w*pB[idx].w;
}

__kernel void DotProduct(__global float4* pA, __global float4* pB, __global float* pC)
{ 
	int idx = get_global_id(0);

	pC[idx] = dot(pA[idx], pB[idx]);
}

